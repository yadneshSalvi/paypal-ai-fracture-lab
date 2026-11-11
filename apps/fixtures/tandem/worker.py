"""One bounded ticket action per invocation; all durable state belongs to the host."""
from __future__ import annotations

import sys
from typing import BinaryIO, cast

from domain import Action, DomainRefusal, FaultyTickets, HardenedTickets, object_value
from protocol import ProtocolFailure, RpcPeer, encode_frame, read_frame
from sdk_adapter import BridgeNotSent, BridgeOutcomeUnknown, SampleBridgeTransport, SdkGateway


def execute(reader: BinaryIO, writer: BinaryIO) -> int:
    start = read_frame(reader)
    if set(start) != {"version", "type", "invocationId", "revision", "action", "intent", "minor", "parameters"} or type(start["version"]) is not int or start["version"] != 1 or start["type"] != "start" or start["revision"] not in ("faulty", "hardened") or not isinstance(start["invocationId"], str) or not isinstance(start["intent"], str) or type(start["minor"]) is not int:
        raise ProtocolFailure("Invalid ticket invocation")
    peer = RpcPeer(reader, writer, start["invocationId"])
    intent, minor = start["intent"], start["minor"]
    result: dict[str, object]
    try:
        with SdkGateway(SampleBridgeTransport(peer.exchange)) as gateway:
            target = HardenedTickets(peer, gateway)
            if start["action"] == "checkout":
                result = FaultyTickets(peer, gateway).checkout(intent, minor) if start["revision"] == "faulty" else target.checkout(intent, minor)
            elif start["action"] == "reserve" and start["revision"] == "hardened":
                result = target.checkout(intent, minor, authorize=True)
            elif start["action"] == "reconcile" and start["revision"] == "hardened":
                key = object_value(start["parameters"]).get("key")
                if not isinstance(key, str):
                    raise ProtocolFailure("The original operation key is required")
                result = target.reconcile(key)
            elif start["action"] == "operation" and start["revision"] == "hardened":
                parameters = object_value(start["parameters"])
                kind, key, resource, amount = parameters.get("kind"), parameters.get("key"), parameters.get("resourceId"), parameters.get("minor")
                if kind not in ("capture_authorization", "refund", "void") or not isinstance(key, str) or not isinstance(resource, str) or type(amount) is not int or type(parameters.get("finalCapture", False)) is not bool:
                    raise ProtocolFailure("Invalid ticket operation")
                result = target.execute(key, Action(kind, intent, amount, resource, final_capture=cast(bool, parameters.get("finalCapture", False))))
            else:
                raise ProtocolFailure("Unknown ticket action")
    except DomainRefusal:
        result = {"status": "refused", "code": "CURRENT_DOMAIN_POLICY_REFUSED"}
    except BridgeNotSent:
        result = {"status": "refused", "code": "SCOPED_BRIDGE_REFUSED"}
    except BridgeOutcomeUnknown:
        # The parent may already have committed the last frame. This process
        # never retries it; a fresh invocation inspects the original operation.
        result = {"status": "unknown", "code": "ORIGINAL_FRAME_UNCERTAIN"}
    writer.write(encode_frame({"version": 1, "type": "complete", "invocationId": start["invocationId"], "source": "sample", "result": result, "requests": peer.sequence}))
    writer.flush()
    return 0


if __name__ == "__main__":
    try:
        sys.exit(execute(sys.stdin.buffer, sys.stdout.buffer))
    except (ProtocolFailure, OSError, ValueError):
        print("TANDEM_INVOCATION_UNAVAILABLE", file=sys.stderr)
        sys.exit(3)
