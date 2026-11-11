from __future__ import annotations
from typing import Final
MAX_EVENT_BYTES: Final = 1 << 20
_BOM: Final = b'\xef\xbb\xbf'
_LINE_ENDS: Final = (b'\n', b'\r')

class SseParser:
    __slots__ = ('_at_start', '_data', '_pending', '_skip_lf', '_tail')

    def __init__(self) -> None:
        ...

    def parse_chunk(self, chunk: bytes) -> list[str]:
        ...

    def _line(self, raw: bytes) -> str | None:
        ...

    def _dispatch(self) -> str | None:
        ...
