from __future__ import annotations
from collections.abc import AsyncIterator, Callable, Iterator, Mapping, Sequence
from dataclasses import dataclass, field
from typing import Any, Generic, NoReturn, TypeAlias, TypeVar, overload
from ._internal.wire import parse_json
from .exceptions import ApiError
from .paginator import AsyncPaginator, Paginator
T = TypeVar('T')
E = TypeVar('E')
ItemT = TypeVar('ItemT')

@dataclass(frozen=True, slots=True)
class Success(Generic[T]):
    payload: T
    status_code: int
    headers: Mapping[str, str] = field(repr=False)

@dataclass(frozen=True, slots=True)
class Failure(Generic[E]):
    error: E
    status_code: int
    headers: Mapping[str, str] = field(repr=False)
ApiResult: TypeAlias = Success[T] | Failure[E]

@dataclass(frozen=True, slots=True)
class RawError:
    status_code: int
    content: bytes

    def text(self, encoding: str='utf-8') -> str:
        ...

    def json(self) -> Any:
        ...

    def __repr__(self) -> str:
        ...

@overload
def unwrap(result: Failure[E], /) -> NoReturn:
    ...

@overload
def unwrap(result: ApiResult[T, E], /) -> T:
    ...

@overload
def unwrap(paginator: Paginator[ApiResult[T, E], ItemT], items_selector: Callable[[T], Sequence[ItemT]], /) -> Paginator[T, ItemT]:
    ...

@overload
def unwrap(paginator: AsyncPaginator[ApiResult[T, E], ItemT], items_selector: Callable[[T], Sequence[ItemT]], /) -> AsyncPaginator[T, ItemT]:
    ...

def unwrap(value: ApiResult[T, E] | Paginator[ApiResult[T, E], ItemT] | AsyncPaginator[ApiResult[T, E], ItemT], items_selector: Callable[[T], Sequence[ItemT]] | None=None, /) -> T | Paginator[T, ItemT] | AsyncPaginator[T, ItemT]:
    ...
