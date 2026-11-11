from __future__ import annotations
from collections.abc import AsyncIterable, Iterator
from dataclasses import dataclass
from pathlib import Path
from typing import Generic, Protocol, TypeAlias, runtime_checkable
from typing_extensions import TypeVar

@runtime_checkable
class BinaryReader(Protocol):

    def read(self, size: int=-1, /) -> bytes:
        ...

@runtime_checkable
class AsyncBinaryReader(Protocol):

    async def read(self, size: int=-1, /) -> bytes:
        ...
BinaryContent: TypeAlias = bytes | bytearray | Path | BinaryReader | Iterator[bytes]
AsyncBinaryContent: TypeAlias = BinaryContent | AsyncBinaryReader | AsyncIterable[bytes]
ContentT_co = TypeVar('ContentT_co', bound=AsyncBinaryContent, default=BinaryContent, covariant=True)

@dataclass(frozen=True, slots=True)
class NamedFile(Generic[ContentT_co]):
    content: ContentT_co
    filename: str | None = None
    media_type: str | None = None
FileInput: TypeAlias = BinaryContent | NamedFile[BinaryContent]
AsyncFileInput: TypeAlias = AsyncBinaryContent | NamedFile[AsyncBinaryContent]
