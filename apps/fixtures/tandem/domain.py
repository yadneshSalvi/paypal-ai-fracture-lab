"""Tandem ticket domain. The target, not its observer, chooses payment policy."""
from __future__ import annotations

from collections.abc import Callable, Mapping
from dataclasses import dataclass
import re
from typing import Literal, Protocol, cast

from sdk_adapter import GatewayResult, SdkGateway

Json = dict[str, object]
WriteKind = Literal["create", "authorize", "capture_order", "capture_authorization", "refund", "void"]


class Store(Protocol):
    def call(self, channel: str, payload: Mapping[str, object]) -> Json: ...


class DuplicateClaim(Exception):
    def __init__(self, operation: Json) -> None:
        self.operation = operation


class DomainRefusal(Exception):
    pass


@dataclass(frozen=True)
class Action:
    kind: WriteKind
    intent: str
    minor: int
    resource_id: str | None = None
    authorize: bool = False
    final_capture: bool = False

    def payload(self) -> Json:
        if not re.fullmatch(r"[A-Za-z0-9_-]{1,80}", self.intent) or type(self.minor) is not int or not 0 <= self.minor <= 1_000_000:
            raise DomainRefusal("Invalid commercial intent")
        if self.kind != "void" and self.minor == 0:
            raise DomainRefusal("A payment amount must be positive")
        if self.kind == "void" and self.minor != 0:
            raise DomainRefusal("Releasing a hold is not a new amount")
        if self.kind != "create" and (self.resource_id is None or not re.fullmatch(r"[A-Za-z0-9_-]{1,100}", self.resource_id)):
            raise DomainRefusal("An original resource is required")
        return {"kind": self.kind, "intent": self.intent, "minor": self.minor, "resourceId": self.resource_id,
                "authorize": self.authorize, "finalCapture": self.final_capture, "currency": "USD"}


def object_value(value: object) -> Json:
    return cast(Json, value) if isinstance(value, dict) and all(isinstance(k, str) for k in value) else {}


def minor_amount(value: object) -> int | None:
    amount = object_value(value)
    number = amount.get("value")
    if amount.get("currency_code") != "USD" or not isinstance(number, str) or re.fullmatch(r"(0|[1-9][0-9]{0,6})\.[0-9]{2}", number) is None:
        return None
    whole, fraction = number.split(".")
    return int(whole) * 100 + int(fraction)


def payments(body: Json, family: str, intent: str) -> list[Json]:
    units = body.get("purchase_units")
    if not isinstance(units, list):
        return []
    found: list[Json] = []
    for unit_value in units:
        unit = object_value(unit_value)
        if unit.get("custom_id") != intent or unit.get("reference_id") != intent:
            continue
        resources = object_value(unit.get("payments")).get(family)
        if isinstance(resources, list):
            found.extend(object_value(resource) for resource in resources)
    return found


def normalized(result: GatewayResult, action: Action, *, readback: bool = False) -> Json:
    """A decoded HTTP 2xx still needs exact identity, amount and lifecycle checks."""
    if result.kind != "observed":
        return {"status": result.kind, "code": result.code, "resourceId": None, "evidence": {}}
    body = cast(Json, result.payload.to_dict()) if result.payload is not None else {}
    resource: Json = body
    allowed: set[str]
    if action.kind == "create":
        units = body.get("purchase_units")
        exact_units = isinstance(units, list) and len(units) == 1
        unit = object_value(units[0]) if isinstance(units, list) and len(units) == 1 else {}
        exact_units = exact_units and unit.get("custom_id") == action.intent and unit.get("reference_id") == action.intent and minor_amount(unit.get("amount")) == action.minor
        allowed = {"CREATED", "APPROVED", "PAYER_ACTION_REQUIRED", "SAVED"}
        if body.get("intent") != ("AUTHORIZE" if action.authorize else "CAPTURE") or not exact_units:
            return {"status": "unknown", "code": "ORDER_IDENTITY_UNPROVEN", "resourceId": None, "evidence": {}}
    elif action.kind in ("authorize", "capture_order"):
        if body.get("id") != action.resource_id:
            return {"status": "unknown", "code": "ORDER_IDENTITY_UNPROVEN", "resourceId": None, "evidence": {}}
        matches = [entry for entry in payments(body, "authorizations" if action.kind == "authorize" else "captures", action.intent)
                   if minor_amount(entry.get("amount")) == action.minor]
        if len(matches) != 1:
            return {"status": "unknown", "code": "EXACT_PAYMENT_UNPROVEN", "resourceId": None, "evidence": {}}
        resource = matches[0]
        allowed = {"CREATED"} if action.kind == "authorize" else {"COMPLETED"}
    elif action.kind == "void":
        # An empty 204 does not prove the remaining hold was actually closed.
        if not readback or body.get("id") != action.resource_id or body.get("status") != "VOIDED":
            return {"status": "unknown", "code": "AUTHORIZATION_READ_REQUIRED", "resourceId": action.resource_id, "evidence": {}}
        allowed = {"VOIDED"}
    else:
        allowed = {"COMPLETED"}
        related = object_value(object_value(body.get("supplementary_data")).get("related_ids"))
        if action.kind == "capture_authorization" and related.get("authorization_id") != action.resource_id:
            return {"status": "unknown", "code": "CAPTURE_PARENT_UNPROVEN", "resourceId": None, "evidence": {}}
        if action.kind == "refund" and body.get("custom_id") != action.intent:
            return {"status": "unknown", "code": "REFUND_INTENT_UNPROVEN", "resourceId": None, "evidence": {}}
        if minor_amount(body.get("amount")) != action.minor:
            return {"status": "unknown", "code": "PAYMENT_AMOUNT_UNPROVEN", "resourceId": None, "evidence": {}}
    identity, status = resource.get("id"), resource.get("status")
    if not isinstance(identity, str) or re.fullmatch(r"[A-Za-z0-9_-]{1,100}", identity) is None:
        return {"status": "unknown", "code": "RESOURCE_ID_UNPROVEN", "resourceId": None, "evidence": {}}
    if status not in allowed:
        # Preserve known identity for exact future reads, including pending resources.
        return {"status": "unknown", "code": "RESOURCE_NOT_TERMINAL", "resourceId": identity, "evidence": resource}
    return {"status": "succeeded", "code": "RESOURCE_CONFIRMED", "resourceId": identity, "evidence": resource}


class HardenedTickets:
    def __init__(self, store: Store, gateway: SdkGateway) -> None:
        self.store = store
        self.gateway = gateway

    def _authority(self) -> Json:
        current = self.store.call("authority.read", {})
        if current.get("allowed") is not True:
            raise DomainRefusal("Current purchase authority is unavailable")
        return current

    def _claim(self, key: str, action: Action) -> Json:
        authority = self._authority()
        reply = self.store.call("operation.claim", {"key": key, "action": action.payload(), "authorityVersion": authority["version"]})
        operation = object_value(reply.get("operation"))
        if reply.get("claimed") is not True:
            if reply.get("code") == "DUPLICATE_CLAIM":
                raise DuplicateClaim(operation)
            raise DomainRefusal("The durable operation could not be claimed")
        return operation

    def reconcile(self, key: str) -> Json:
        operation = object_value(self.store.call("operation.read", {"key": key}).get("operation"))
        value = object_value(operation.get("action"))
        kind, intent, minor, resource = value.get("kind"), value.get("intent"), value.get("minor"), value.get("resourceId")
        if kind not in ("create", "authorize", "capture_order", "capture_authorization", "refund", "void") or not isinstance(intent, str) or type(minor) is not int or not (resource is None or isinstance(resource, str)):
            raise DomainRefusal("No original operation can be reconciled")
        return self._recover(key, Action(kind, intent, minor, resource, authorize=value.get("authorize") is True, final_capture=value.get("finalCapture") is True), operation)

    def _dispatch(self, action: Action, request_id: str) -> GatewayResult:
        if action.kind == "create":
            return self.gateway.create_order(action.intent, action.minor, request_id, authorize=action.authorize)
        assert action.resource_id is not None
        if action.kind == "authorize":
            return self.gateway.authorize_order(action.resource_id, request_id)
        if action.kind == "capture_order":
            return self.gateway.capture_order(action.resource_id, request_id)
        if action.kind == "capture_authorization":
            return self.gateway.capture_authorization(action.resource_id, action.minor, request_id, final_capture=action.final_capture)
        if action.kind == "refund":
            return self.gateway.refund_capture(action.resource_id, action.intent, action.minor, request_id)
        return self.gateway.void_authorization(action.resource_id, request_id)

    def _recover(self, key: str, action: Action, operation: Json) -> Json:
        if operation.get("status") not in ("dispatching", "unknown"):
            return operation
        known = operation.get("resourceId")
        read: Callable[[], GatewayResult] | None = None
        if action.kind in ("authorize", "capture_order") and action.resource_id:
            read = lambda: self.gateway.get_order(cast(str, action.resource_id))
        elif action.kind == "create" and isinstance(known, str):
            read = lambda: self.gateway.get_order(known)
        elif action.kind == "capture_authorization" and isinstance(known, str):
            read = lambda: self.gateway.get_capture(known)
        elif action.kind == "refund" and isinstance(known, str):
            read = lambda: self.gateway.get_refund(known)
        elif action.kind == "void" and action.resource_id:
            read = lambda: self.gateway.get_authorization(cast(str, action.resource_id))
        if read is None:
            return operation
        result = normalized(read(), action, readback=True)
        if isinstance(known, str) and action.kind in ("create", "capture_authorization", "refund", "void") and result.get("resourceId") not in (None, known):
            result = {"status": "unknown", "code": "ORIGINAL_RESOURCE_CHANGED", "resourceId": known, "evidence": {}}
        # A failed GET does not establish that an earlier POST failed.
        if result["status"] in ("not_sent", "refused"):
            result = {"status": "unknown", "code": "ORIGINAL_READ_UNAVAILABLE", "resourceId": known, "evidence": {}}
        return object_value(self.store.call("operation.record", {"key": key, "phase": "observed", "result": result}).get("operation"))

    def execute(self, key: str, action: Action) -> Json:
        try:
            operation = self._claim(key, action)
        except DuplicateClaim as duplicate:
            return self._recover(key, action, duplicate.operation)
        # The database checks the exact current authority again while marking
        # dispatching; checking once before an asynchronous claim is insufficient.
        self._authority()
        operation = object_value(self.store.call("operation.record", {"key": key, "phase": "dispatching"}).get("operation"))
        request_id = operation.get("providerRequestId")
        if not isinstance(request_id, str):
            raise DomainRefusal("The durable provider identity is missing")
        response = self._dispatch(action, request_id)
        result = normalized(response, action)
        operation = object_value(self.store.call("operation.record", {"key": key, "phase": "observed", "result": result}).get("operation"))
        if result["status"] == "unknown":
            return self._recover(key, action, operation)
        return operation

    def checkout(self, intent: str, minor: int, *, authorize: bool = False) -> Json:
        created = self.execute("purchase:create", Action("create", intent, minor, authorize=authorize))
        order_id = created.get("resourceId")
        if created.get("status") != "succeeded" or not isinstance(order_id, str):
            return self._ticket("checking" if created.get("status") not in ("refused", "not_sent") else "failed", None)
        kind: WriteKind = "authorize" if authorize else "capture_order"
        payment = self.execute(f"purchase:{kind}", Action(kind, intent, minor, order_id))
        if payment.get("status") == "succeeded" and authorize:
            return self._ticket("reserved", cast(str, payment.get("resourceId")))
        if payment.get("status") == "succeeded":
            capture_id = payment.get("resourceId")
            if isinstance(capture_id, str):
                self.store.call("entitlement.claim", {"key": intent, "captureId": capture_id, "minor": minor, "deduplicate": True})
                return self._ticket("paid", capture_id)
        return self._ticket("checking" if payment.get("status") not in ("refused", "not_sent") else "failed", None)

    def _ticket(self, status: str, resource: str | None) -> Json:
        return self.store.call("ticket.record", {"status": status, "resourceId": resource, "preserveCompleted": True})


class FaultyTickets:
    """Disclosed defect specimen: each retry creates a fresh purchase."""
    def __init__(self, store: Store, gateway: SdkGateway) -> None:
        self.store = store
        self.gateway = gateway

    def checkout(self, intent: str, minor: int) -> Json:
        created = self.gateway.create_order(intent, minor, None)
        body = cast(Json, created.payload.to_dict()) if created.payload else {}
        order_id = body.get("id")
        if not isinstance(order_id, str):
            return self.store.call("ticket.record", {"status": "failed", "resourceId": None})
        captured = self.gateway.capture_order(order_id, None)
        body = cast(Json, captured.payload.to_dict()) if captured.payload else {}
        found = payments(body, "captures", intent)
        if captured.kind != "observed" or not found:
            # Intentional defect: an uncertain response is presented as failure.
            return self.store.call("ticket.record", {"status": "failed", "resourceId": None})
        capture_id = found[0].get("id")
        # Intentional defects: no completed-status check or semantic uniqueness.
        self.store.call("entitlement.claim", {"key": intent, "captureId": capture_id, "minor": minor, "deduplicate": False})
        return self.store.call("ticket.record", {"status": "paid", "resourceId": capture_id})
