from __future__ import annotations

import base64
from io import BytesIO
import json
import pytest

from protocol import MAX_FRAME_BYTES, ProtocolFailure, RpcPeer, decode_frame, encode_frame
from sdk_adapter import BridgeNotSent, BridgeOutcomeUnknown, SampleBridgeTransport, SdkGateway

INVOCATION = "sample-invocation-0001"


def reply(sequence: int = 1, /, **changes: object) -> bytes:
    frame: dict[str, object] = {"version": 1, "type": "reply", "invocationId": INVOCATION, "sequence": sequence, "requestId": f"{INVOCATION}:{sequence}", "outcome": "ok", "payload": {}}
    frame.update(changes)
    return encode_frame(frame)


def test_actual_sdk_two_round_trips_keep_order_and_request_identity() -> None:
    body = base64.b64encode(b'{"id":"SAMPLE-O1","status":"CREATED"}').decode()
    payload = {"status": 201, "headers": {"content-type": "application/json"}, "bodyBase64": body}
    outgoing = BytesIO()
    peer = RpcPeer(BytesIO(reply(payload=payload) + reply(2, payload={**payload, "status": 200})), outgoing, INVOCATION)
    with SdkGateway(SampleBridgeTransport(peer.exchange)) as gateway:
        created = gateway.create_order("ticket-1", 4800, "purchase-create-1")
        observed = gateway.get_order("SAMPLE-O1")
    assert created.kind == observed.kind == "observed"
    frames = [decode_frame(line + b"\n") for line in outgoing.getvalue().splitlines()]
    assert [f["sequence"] for f in frames] == [1, 2]
    first = frames[0]["payload"]
    assert isinstance(first, dict) and first["path"] == "/v2/checkout/orders"
    assert isinstance(first["headers"], dict) and first["headers"]["paypal-request-id"] == "purchase-create-1"
    assert "authorization" not in json.dumps(frames) and "SAMPLE-NOT-A-CREDENTIAL" not in json.dumps(frames)


@pytest.mark.parametrize("raw", [b'', b'{"x":1}', b'[]\n', b'{"x":1,"x":2}\n', b'{"x":NaN}\n', b'{"x":"\xff"}\n', b' ' * (MAX_FRAME_BYTES + 1) + b'\n'])
def test_malformed_or_partial_frames_are_rejected(raw: bytes) -> None:
    with pytest.raises(ProtocolFailure):
        decode_frame(raw)


@pytest.mark.parametrize("changes", [{"invocationId": "another-invocation"}, {"sequence": 2}, {"sequence": True}, {"version": True}, {"requestId": "different"}, {"extra": "not-allowed"}, {"payload": []}, {"outcome": "maybe"}])
def test_corrupt_reply_poisoned_channel_never_redispatches(changes: dict[str, object]) -> None:
    outgoing = BytesIO()
    peer = RpcPeer(BytesIO(reply(**changes)), outgoing, INVOCATION)
    with pytest.raises(BridgeOutcomeUnknown):
        peer.call("operation.claim", {"intent": "ticket-1"})
    sent = outgoing.getvalue()
    with pytest.raises(BridgeNotSent):
        peer.call("operation.claim", {"intent": "ticket-1"})
    assert peer.broken and outgoing.getvalue() == sent and len(sent.splitlines()) == 1


class PartialWriter(BytesIO):
    def write(self, buffer: object, /) -> int:
        assert isinstance(buffer, bytes)
        return super().write(buffer[:20])


def test_partial_write_is_unknown_and_not_retried() -> None:
    outgoing = PartialWriter()
    peer = RpcPeer(BytesIO(), outgoing, INVOCATION)
    with pytest.raises(BridgeOutcomeUnknown):
        peer.call("operation.claim", {})
    assert len(outgoing.getvalue()) == 20 and peer.broken


def test_lost_reply_is_unknown_without_blind_retry() -> None:
    outgoing = BytesIO()
    peer = RpcPeer(BytesIO(), outgoing, INVOCATION)
    with pytest.raises(BridgeOutcomeUnknown):
        peer.call("provider.exchange", {"method": "POST"})
    assert len(outgoing.getvalue().splitlines()) == 1


def test_unsupported_channel_and_oversized_request_do_not_write() -> None:
    outgoing = BytesIO()
    peer = RpcPeer(BytesIO(), outgoing, INVOCATION)
    with pytest.raises(BridgeNotSent):
        peer.call("sql.execute", {"query": "SELECT secret"})
    with pytest.raises(BridgeNotSent):
        peer.call("ticket.record", {"text": "x" * MAX_FRAME_BYTES})
    assert outgoing.getvalue() == b'' and peer.sequence == 0


@pytest.mark.parametrize(("outcome", "kind"), [("not_sent", "not_sent"), ("unknown", "unknown"), ("refused", "not_sent")])
def test_parent_classification_survives_sdk_boundary(outcome: str, kind: str) -> None:
    peer = RpcPeer(BytesIO(reply(outcome=outcome)), BytesIO(), INVOCATION)
    with SdkGateway(SampleBridgeTransport(peer.exchange)) as gateway:
        assert gateway.create_order("ticket-1", 4800, "create-1").kind == kind


@pytest.mark.parametrize("payload", [
    {"status": 201, "headers": {"authorization": "do-not-forward"}, "bodyBase64": "e30="},
    {"status": 201, "headers": {}, "bodyBase64": "not-base64"},
    {"status": True, "headers": {}, "bodyBase64": "e30="},
    {"status": 201, "headers": {}, "bodyBase64": "e30=", "extra": "untrusted"},
])
def test_unusable_provider_reply_remains_unknown(payload: dict[str, object]) -> None:
    peer = RpcPeer(BytesIO(reply(payload=payload)), BytesIO(), INVOCATION)
    with SdkGateway(SampleBridgeTransport(peer.exchange)) as gateway:
        result = gateway.create_order("ticket-1", 4800, "create-1")
    assert result.kind == "unknown" and peer.broken


def test_real_python_worker_process_encodes_sdk_frames_without_inherited_secrets() -> None:
    from pathlib import Path
    import subprocess
    import sys
    start = encode_frame({"version": 1, "type": "start", "invocationId": INVOCATION, "mode": "sample-sdk-wire-qualification"})
    payload = {"status": 201, "headers": {"content-type": "application/json"}, "bodyBase64": base64.b64encode(b'{"id":"SAMPLE-QUALIFICATION-ORDER","status":"CREATED"}').decode()}
    result = subprocess.run([sys.executable, str(Path(__file__).with_name("qualify_worker.py"))], input=start + reply(payload=payload) + reply(2, payload={**payload, "status": 200}), capture_output=True, timeout=10, env={"PATH": "/usr/bin:/bin", "PYTHONDONTWRITEBYTECODE": "1"})
    assert result.returncode == 0 and result.stderr == b''
    frames = [decode_frame(line + b'\n') for line in result.stdout.splitlines()]
    assert len(frames) == 3 and frames[0]["channel"] == frames[1]["channel"] == "provider.exchange"
    assert frames[2] == {"version": 1, "type": "complete", "invocationId": INVOCATION, "source": "sample", "create": "observed", "read": "observed", "requests": 2}
