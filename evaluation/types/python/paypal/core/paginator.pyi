from __future__ import annotations
from collections.abc import AsyncIterator, Callable, Iterator, Sequence
from dataclasses import dataclass
from typing import Generic, TypeVar
PageT = TypeVar('PageT')
ItemT = TypeVar('ItemT')

@dataclass(frozen=True, slots=True)
class Paginator(Generic[PageT, ItemT]):
    _fetch_pages: Callable[[], Iterator[PageT]]
    _items_selector: Callable[[PageT], Sequence[ItemT]]

    def __iter__(self) -> Iterator[ItemT]:
        ...

    def iter_pages(self) -> Iterator[PageT]:
        ...

@dataclass(frozen=True, slots=True)
class AsyncPaginator(Generic[PageT, ItemT]):
    _fetch_pages: Callable[[], AsyncIterator[PageT]]
    _items_selector: Callable[[PageT], Sequence[ItemT]]

    async def __aiter__(self) -> AsyncIterator[ItemT]:
        ...

    def iter_pages(self) -> AsyncIterator[PageT]:
        ...
