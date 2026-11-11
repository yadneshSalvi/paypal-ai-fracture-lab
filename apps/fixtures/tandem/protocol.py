"""Bounded, single-flight IPC for the credential-free Tandem worker.

The parent fixes the tenant/run scope. The worker cannot choose another run,
SQL statement, file path or URL. A broken exchange poisons the channel; neither
side may silently replay a possibly delivered mutation frame.
"""
from __future__ import annotations

import base64
from collections.abc import Mapping
import json
import re
from typing import BinaryIO, cast

from sdk_adapter import BridgeNotSent, BridgeOutcomeUnknown, BufferedResponse, SANDBOX_ORIGIN, WireRequest

MAX_FRAME_BYTES = 196_608
MAX_BODY_BYTES = 131_072
CHANNELS = frozenset({"provider.exchange", "operation.claim", "operation.read", "operation.record", "authority.read", "ticket.read", "ticket.record", "entitlement.claim"})
SAFE_RESPONSE_HEADERS = frozenset({"content-type", "paypal-debug-id"})


class ProtocolFailure(Exception):
    """Malformed peer data. Details are intentionally not emitted to stdout."""


def _unique_object(pairs: list[tuple[str, object]]) -> dict[str, object]:
    result: dict[str, object] = {}
    for key, value in pairs:
        if key in result:
            raise ProtocolFailure("Duplicate JSON key")
        result[key] = value
    return result


def _reject_constant(value: str) -> object:
    raise ProtocolFailure("Non-finite JSON constant")


def decode_frame(raw: bytes) -> dict[str, object]:
    if len(raw) > MAX_FRAME_BYTES or not raw.endswith(b"\n"):
        raise ProtocolFailure("Incomplete or oversized frame")
    try:
        value: object = json.loads(raw.decode("utf-8", errors="strict"), object_pairs_hook=_unique_object, parse_constant=_reject_constant)
    except (ValueError, UnicodeError, RecursionError) as error:
        raise ProtocolFailure("Invalid frame") from error
    if not isinstance(value, dict) or any(not isinstance(key, str) for key in value):
        raise ProtocolFailure("Expected object")
    return cast(dict[str, object], value)


def encode_frame(frame: Mapping[str, object]) -> bytes:
    try:
        raw = (json.dumps(frame, ensure_ascii=False, allow_nan=False, separators=(",", ":")) + "\n").encode("utf-8")
    except (TypeError, ValueError, UnicodeError, RecursionError) as error:
        raise ProtocolFailure("Unencodable frame") from error
    if len(raw) > MAX_FRAME_BYTES:
        raise ProtocolFailure("Oversized frame")
    return raw


def read_frame(reader: BinaryIO) -> dict[str, object]:
    return decode_frame(reader.readline(MAX_FRAME_BYTES + 1))


class RpcPeer:
    def __init__(self, reader: BinaryIO, writer: BinaryIO, invocation_id: str) -> None:
        if re.fullmatch(r"[a-zA-Z0-9_-]{16,80}", invocation_id) is None:
            raise ProtocolFailure("Invalid invocation")
        self.reader = reader
        self.writer = writer
        self.invocation_id = invocation_id
        self.sequence = 0
        self.broken = False

    def call(self, channel: str, payload: Mapping[str, object]) -> dict[str, object]:
        if self.broken or channel not in CHANNELS:
            raise BridgeNotSent("The worker channel is unavailable")
        sequence = self.sequence + 1
        request_id = f"{self.invocation_id}:{sequence}"
        try:
            raw = encode_frame({"version": 1, "type": "request", "invocationId": self.invocation_id, "sequence": sequence, "requestId": request_id, "channel": channel, "payload": payload})
        except ProtocolFailure as error:
            raise BridgeNotSent("The request could not be encoded") from error
        self.sequence = sequence
        try:
            # Any partial write, flush failure or lost reply is uncertain. There
            # is deliberately no resend loop here.
            if self.writer.write(raw) != len(raw):
                raise ProtocolFailure("Incomplete frame write")
            self.writer.flush()
            reply = read_frame(self.reader)
            if set(reply) != {"version", "type", "invocationId", "sequence", "requestId", "outcome", "payload"}:
                raise ProtocolFailure("Unexpected reply fields")
            if type(reply["version"]) is not int or reply["version"] != 1 or reply["type"] != "reply" or reply["invocationId"] != self.invocation_id or type(reply["sequence"]) is not int or reply["sequence"] != sequence or reply["requestId"] != request_id:
                raise ProtocolFailure("Reply correlation failed")
            if reply["outcome"] not in ("ok", "not_sent", "unknown", "refused") or not isinstance(reply["payload"], dict):
                raise ProtocolFailure("Unexpected reply shape")
        except (ProtocolFailure, OSError, ValueError) as error:
            self.broken = True
            raise BridgeOutcomeUnknown("The original frame requires reconciliation") from error
        outcome = reply["outcome"]
        if outcome == "not_sent":
            raise BridgeNotSent("The parent proved no dispatch")
        if outcome == "unknown":
            raise BridgeOutcomeUnknown("The parent could not establish the original outcome")
        if outcome == "refused":
            raise BridgeNotSent("The scoped parent refused the request")
        return cast(dict[str, object], reply["payload"])

    def exchange(self, wire: WireRequest) -> BufferedResponse:
        payload = self.call("provider.exchange", {"method": wire.method, "path": wire.path, "headers": dict(wire.headers), "body": wire.body, "timeout": wire.timeout})
        try:
            if set(payload) != {"status", "headers", "bodyBase64"}:
                raise ProtocolFailure("Invalid response fields")
            status, headers, body_text = payload["status"], payload["headers"], payload["bodyBase64"]
            if type(status) is not int or not 100 <= status <= 599 or not isinstance(headers, dict) or not isinstance(body_text, str) or len(body_text) > 174_764:
                raise ProtocolFailure("Invalid response shape")
            if any(not isinstance(k, str) or k not in SAFE_RESPONSE_HEADERS or not isinstance(v, str) or len(v) > 200 for k, v in headers.items()):
                raise ProtocolFailure("Unexpected response headers")
            body = base64.b64decode(body_text, validate=True)
            if len(body) > MAX_BODY_BYTES:
                raise ProtocolFailure("Response body too large")
            return BufferedResponse(SANDBOX_ORIGIN + wire.path, status, body, cast(dict[str, str], headers))
        except (ProtocolFailure, ValueError) as error:
            self.broken = True
            raise BridgeOutcomeUnknown("The received provider response is unusable") from error
