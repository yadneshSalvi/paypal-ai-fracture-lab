from __future__ import annotations
from collections.abc import AsyncIterator, Awaitable, Callable, Iterator, Mapping, Sequence
from dataclasses import dataclass, replace
from typing import Any, Final, Generic, TypeAlias, TypeVar, overload
from urllib.parse import parse_qsl, urljoin, urlsplit
from typing_extensions import TypeForm
from ._internal.subscripts import SubscriptOnly
from ._internal.urls import build_url
from .optionality import OptionalNullable, UnsetType
from .paginator import AsyncPaginator, Paginator
from .params import Param, SerializationFormat, UrlTemplate, param
from .results import ApiResult, Success, unwrap
PayloadT = TypeVar('PayloadT')
E = TypeVar('E')
ItemT = TypeVar('ItemT')

@dataclass(frozen=True, kw_only=True, slots=True)
class OffsetState(Generic[PayloadT]):
    offset: int | None
    limit: int | None
    item_count: Callable[[PayloadT], int]
    has_more: Callable[[PayloadT, Mapping[str, str]], OptionalNullable[bool]] | None = None
    total_items: Callable[[PayloadT, Mapping[str, str]], OptionalNullable[int]] | None = None

    def advance(self, *, payload: PayloadT, headers: Mapping[str, str]) -> OffsetState[PayloadT] | None:
        ...

@dataclass(frozen=True, kw_only=True, slots=True)
class PageState(Generic[PayloadT]):
    page: int | None
    limit: int | None
    item_count: Callable[[PayloadT], int]
    has_more: Callable[[PayloadT, Mapping[str, str]], OptionalNullable[bool]] | None = None
    total_pages: Callable[[PayloadT, Mapping[str, str]], OptionalNullable[int]] | None = None

    def advance(self, *, payload: PayloadT, headers: Mapping[str, str]) -> PageState[PayloadT] | None:
        ...

@dataclass(frozen=True, kw_only=True, slots=True)
class CursorState(Generic[PayloadT]):
    cursor: str | None
    next_cursor: Callable[[PayloadT, Mapping[str, str]], OptionalNullable[str]]
    has_more: Callable[[PayloadT, Mapping[str, str]], OptionalNullable[bool]] | None = None

    def advance(self, *, payload: PayloadT, headers: Mapping[str, str]) -> CursorState[PayloadT] | None:
        ...

@dataclass(frozen=True, kw_only=True, slots=True)
class KeysetState(Generic[PayloadT]):
    key: str | None
    limit: int | None
    item_count: Callable[[PayloadT], int]
    next_key: Callable[[PayloadT, Mapping[str, str]], OptionalNullable[str]]
    has_more: Callable[[PayloadT, Mapping[str, str]], OptionalNullable[bool]] | None = None

    def advance(self, *, payload: PayloadT, headers: Mapping[str, str]) -> KeysetState[PayloadT] | None:
        ...

@dataclass(frozen=True, kw_only=True, slots=True)
class LinkState(Generic[PayloadT]):
    url_template: UrlTemplate
    query_params: Sequence[Param[Any]]
    next_link: Callable[[PayloadT, Mapping[str, str]], OptionalNullable[str]]

    def advance(self, *, payload: PayloadT, headers: Mapping[str, str]) -> LinkState[PayloadT] | None:
        ...

def _resolve_next_link(current_url: str, next_link: str) -> tuple[UrlTemplate, tuple[Param[Any], ...]]:
    ...

class _OffsetStateFactory(SubscriptOnly):
    __slots__ = ()
    factory_name = 'offset_state'
    spelling = 'offset_state[PayloadT](…), e.g. offset_state[Products](offset=offset, limit=limit, item_count=…)'

    def __getitem__(self, declared: TypeForm[PayloadT]) -> type[OffsetState[PayloadT]]:
        ...

class _PageStateFactory(SubscriptOnly):
    __slots__ = ()
    factory_name = 'page_state'
    spelling = 'page_state[PayloadT](…), e.g. page_state[Products](page=page, limit=limit, item_count=…)'

    def __getitem__(self, declared: TypeForm[PayloadT]) -> type[PageState[PayloadT]]:
        ...

class _CursorStateFactory(SubscriptOnly):
    __slots__ = ()
    factory_name = 'cursor_state'
    spelling = 'cursor_state[PayloadT](…), e.g. cursor_state[Orders](cursor=cursor, next_cursor=…)'

    def __getitem__(self, declared: TypeForm[PayloadT]) -> type[CursorState[PayloadT]]:
        ...

class _KeysetStateFactory(SubscriptOnly):
    __slots__ = ()
    factory_name = 'keyset_state'
    spelling = 'keyset_state[PayloadT](…), e.g. keyset_state[CardTransactions](key=since, …)'

    def __getitem__(self, declared: TypeForm[PayloadT]) -> type[KeysetState[PayloadT]]:
        ...

class _LinkStateFactory(SubscriptOnly):
    __slots__ = ()
    factory_name = 'link_state'
    spelling = 'link_state[PayloadT](…), e.g. link_state[Orders](url_template=…, query_params=…, next_link=…)'

    def __getitem__(self, declared: TypeForm[PayloadT]) -> type[LinkState[PayloadT]]:
        ...
offset_state: Final = _OffsetStateFactory()
page_state: Final = _PageStateFactory()
cursor_state: Final = _CursorStateFactory()
keyset_state: Final = _KeysetStateFactory()
link_state: Final = _LinkStateFactory()
PagingState: TypeAlias = OffsetState[PayloadT] | PageState[PayloadT] | CursorState[PayloadT] | KeysetState[PayloadT] | LinkState[PayloadT]

@overload
def paginate(*, initial_state: OffsetState[PayloadT], fetch_page: Callable[[OffsetState[PayloadT]], ApiResult[PayloadT, E]], items_selector: Callable[[PayloadT], Sequence[ItemT]]) -> Paginator[ApiResult[PayloadT, E], ItemT]:
    ...

@overload
def paginate(*, initial_state: PageState[PayloadT], fetch_page: Callable[[PageState[PayloadT]], ApiResult[PayloadT, E]], items_selector: Callable[[PayloadT], Sequence[ItemT]]) -> Paginator[ApiResult[PayloadT, E], ItemT]:
    ...

@overload
def paginate(*, initial_state: CursorState[PayloadT], fetch_page: Callable[[CursorState[PayloadT]], ApiResult[PayloadT, E]], items_selector: Callable[[PayloadT], Sequence[ItemT]]) -> Paginator[ApiResult[PayloadT, E], ItemT]:
    ...

@overload
def paginate(*, initial_state: KeysetState[PayloadT], fetch_page: Callable[[KeysetState[PayloadT]], ApiResult[PayloadT, E]], items_selector: Callable[[PayloadT], Sequence[ItemT]]) -> Paginator[ApiResult[PayloadT, E], ItemT]:
    ...

@overload
def paginate(*, initial_state: LinkState[PayloadT], fetch_page: Callable[[LinkState[PayloadT]], ApiResult[PayloadT, E]], items_selector: Callable[[PayloadT], Sequence[ItemT]]) -> Paginator[ApiResult[PayloadT, E], ItemT]:
    ...

def paginate(*, initial_state: PagingState[PayloadT], fetch_page: Callable[[Any], ApiResult[PayloadT, E]], items_selector: Callable[[PayloadT], Sequence[ItemT]]) -> Paginator[ApiResult[PayloadT, E], ItemT]:
    ...

@overload
def async_paginate(*, initial_state: OffsetState[PayloadT], fetch_page: Callable[[OffsetState[PayloadT]], Awaitable[ApiResult[PayloadT, E]]], items_selector: Callable[[PayloadT], Sequence[ItemT]]) -> AsyncPaginator[ApiResult[PayloadT, E], ItemT]:
    ...

@overload
def async_paginate(*, initial_state: PageState[PayloadT], fetch_page: Callable[[PageState[PayloadT]], Awaitable[ApiResult[PayloadT, E]]], items_selector: Callable[[PayloadT], Sequence[ItemT]]) -> AsyncPaginator[ApiResult[PayloadT, E], ItemT]:
    ...

@overload
def async_paginate(*, initial_state: CursorState[PayloadT], fetch_page: Callable[[CursorState[PayloadT]], Awaitable[ApiResult[PayloadT, E]]], items_selector: Callable[[PayloadT], Sequence[ItemT]]) -> AsyncPaginator[ApiResult[PayloadT, E], ItemT]:
    ...

@overload
def async_paginate(*, initial_state: KeysetState[PayloadT], fetch_page: Callable[[KeysetState[PayloadT]], Awaitable[ApiResult[PayloadT, E]]], items_selector: Callable[[PayloadT], Sequence[ItemT]]) -> AsyncPaginator[ApiResult[PayloadT, E], ItemT]:
    ...

@overload
def async_paginate(*, initial_state: LinkState[PayloadT], fetch_page: Callable[[LinkState[PayloadT]], Awaitable[ApiResult[PayloadT, E]]], items_selector: Callable[[PayloadT], Sequence[ItemT]]) -> AsyncPaginator[ApiResult[PayloadT, E], ItemT]:
    ...

def async_paginate(*, initial_state: PagingState[PayloadT], fetch_page: Callable[[Any], Awaitable[ApiResult[PayloadT, E]]], items_selector: Callable[[PayloadT], Sequence[ItemT]]) -> AsyncPaginator[ApiResult[PayloadT, E], ItemT]:
    ...
