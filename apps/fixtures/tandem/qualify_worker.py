"""Executable SDK/IPC qualification, not the ticket application or evaluator."""
from __future__ import annotations

import sys
from typing import BinaryIO

from protocol import ProtocolFailure, RpcPeer, encode_frame, read_frame
from sdk_adapter import SampleBridgeTransport, SdkGateway


def qualify(reader: BinaryIO, writer: BinaryIO) -> int:
    start = read_frame(reader)
    if set(start) != {"version", "type", "invocationId", "mode"} or type(start["version"]) is not int or start["version"] != 1 or start["type"] != "start" or start["mode"] != "sample-sdk-wire-qualification" or not isinstance(start["invocationId"], str):
        raise ProtocolFailure("Invalid qualification start")
    peer = RpcPeer(reader, writer, start["invocationId"])
    with SdkGateway(SampleBridgeTransport(peer.exchange)) as gateway:
        created = gateway.create_order("qualification-ticket", 4800, "qualification-create-1", authorize=True)
        observed = gateway.get_order("SAMPLE-QUALIFICATION-ORDER")
    frame = encode_frame({"version": 1, "type": "complete", "invocationId": start["invocationId"], "source": "sample", "create": created.kind, "read": observed.kind, "requests": peer.sequence})
    writer.write(frame)
    writer.flush()
    return 0 if created.kind == observed.kind == "observed" else 2


if __name__ == "__main__":
    try:
        sys.exit(qualify(sys.stdin.buffer, sys.stdout.buffer))
    except (ProtocolFailure, OSError, ValueError):
        # Peer input and SDK/provider content are never reflected in diagnostics.
        print("TANDEM_QUALIFICATION_UNAVAILABLE", file=sys.stderr)
        sys.exit(3)
