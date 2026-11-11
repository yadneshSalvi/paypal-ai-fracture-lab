from __future__ import annotations
from collections.abc import Callable
from dataclasses import dataclass
from typing import Any, Final, Generic, Protocol, TypeVar
from pydantic import TypeAdapter
from typing_extensions import TypeForm
from ._internal.subscripts import SubscriptOnly
from ._internal.wire import parse_json
from .adapters import adapter_for
from .event_streams import AsyncEventStream, EventStream
from .file_responses import AsyncFileResponse, FileResponse
from .results import RawError
from .transport import AsyncHttpResponse, HttpResponse
T = TypeVar('T')
T_co = TypeVar('T_co', covariant=True)
E_co = TypeVar('E_co', covariant=True)

class ResponseDecoder(Protocol[T_co]):

    def decode(self, response: HttpResponse) -> T_co:
        ...

class AsyncResponseDecoder(Protocol[T_co]):

    async def decode(self, response: AsyncHttpResponse) -> T_co:
        ...

class ErrorMapper(Protocol[E_co]):

    def map(self, status_code: int, content: bytes) -> E_co:
        ...

@dataclass(frozen=True, slots=True)
class BufferedDecoder(Generic[T]):
    decode_body: Callable[[bytes], T]

    def decode(self, response: HttpResponse) -> T:
        ...

@dataclass(frozen=True, slots=True)
class AsyncBufferedDecoder(Generic[T]):
    decode_body: Callable[[bytes], T]

    async def decode(self, response: AsyncHttpResponse) -> T:
        ...

def _decode_utf8(content: bytes) -> str:
    ...

@dataclass(frozen=True, slots=True)
class BodyDecoder(Generic[T]):
    parse: Callable[[bytes], Any]
    adapter: TypeAdapter[T]

    def decode(self, content: bytes) -> T:
        ...

@dataclass(frozen=True, slots=True)
class _BufferedDecoderFactory(SubscriptOnly):
    parse: Callable[[bytes], Any]
    factory_name: str
    spelling: str

    def __getitem__(self, declared: TypeForm[T]) -> ResponseDecoder[T]:
        ...

@dataclass(frozen=True, slots=True)
class _AsyncBufferedDecoderFactory(SubscriptOnly):
    parse: Callable[[bytes], Any]
    factory_name: str
    spelling: str

    def __getitem__(self, declared: TypeForm[T]) -> AsyncResponseDecoder[T]:
        ...
json_decoder: Final = _BufferedDecoderFactory(parse_json, 'json_decoder', 'decoder=json_decoder[T], e.g. json_decoder[Person]')
text_decoder: Final = _BufferedDecoderFactory(_decode_utf8, 'text_decoder', 'decoder=text_decoder[T], e.g. text_decoder[int]')
async_json_decoder: Final = _AsyncBufferedDecoderFactory(parse_json, 'async_json_decoder', 'decoder=async_json_decoder[T], e.g. async_json_decoder[Person]')
async_text_decoder: Final = _AsyncBufferedDecoderFactory(_decode_utf8, 'async_text_decoder', 'decoder=async_text_decoder[T], e.g. async_text_decoder[int]')

class _DecodeJsonFactory(SubscriptOnly):
    factory_name = 'decode_json'
    spelling = 'decode_json[T](content), e.g. decode_json[ProblemDetails](content)'

    def __getitem__(self, declared: TypeForm[T]) -> Callable[[bytes], T]:
        ...

class _DecodeTextFactory:

    def __getitem__(self, declared: TypeForm[T]) -> Callable[[bytes], T]:
        ...

    def __call__(self, content: bytes) -> str:
        ...
decode_json: Final = _DecodeJsonFactory()
decode_text: Final = _DecodeTextFactory()

def _discard_body(content: bytes) -> None:
    ...
empty_response: Final[ResponseDecoder[None]] = BufferedDecoder(_discard_body)
async_empty_response: Final[AsyncResponseDecoder[None]] = AsyncBufferedDecoder(_discard_body)

@dataclass(frozen=True, slots=True)
class RawErrorResponse:

    def map(self, status_code: int, content: bytes) -> RawError:
        ...
raw_error_response: Final[ErrorMapper[RawError]] = RawErrorResponse()

@dataclass(frozen=True, slots=True)
class FileDecoder:

    def decode(self, response: HttpResponse) -> FileResponse:
        ...

@dataclass(frozen=True, slots=True)
class AsyncFileDecoder:

    async def decode(self, response: AsyncHttpResponse) -> AsyncFileResponse:
        ...
file_decoder: Final[ResponseDecoder[FileResponse]] = FileDecoder()
async_file_decoder: Final[AsyncResponseDecoder[AsyncFileResponse]] = AsyncFileDecoder()

@dataclass(frozen=True, slots=True)
class EventStreamDecoder(Generic[T]):
    decode_data: Callable[[str], T]
    sentinel: str | None

    def decode(self, response: HttpResponse) -> EventStream[T]:
        ...

@dataclass(frozen=True, slots=True)
class AsyncEventStreamDecoder(Generic[T]):
    decode_data: Callable[[str], T]
    sentinel: str | None

    async def decode(self, response: AsyncHttpResponse) -> AsyncEventStream[T]:
        ...

@dataclass(frozen=True, slots=True)
class EventStreamDecoderBuilder(Generic[T]):
    decode_data: Callable[[str], T]

    def __call__(self, *, sentinel: str | None=None) -> ResponseDecoder[EventStream[T]]:
        ...

@dataclass(frozen=True, slots=True)
class AsyncEventStreamDecoderBuilder(Generic[T]):
    decode_data: Callable[[str], T]

    def __call__(self, *, sentinel: str | None=None) -> AsyncResponseDecoder[AsyncEventStream[T]]:
        ...

def _validates_json(adapter: TypeAdapter[Any]) -> Callable[[str], Any]:
    ...

def _validates_value(adapter: TypeAdapter[Any]) -> Callable[[str], Any]:
    ...

@dataclass(frozen=True, slots=True)
class _EventDecoderFactory(SubscriptOnly):
    read_data: Callable[[TypeAdapter[Any]], Callable[[str], Any]]
    factory_name: str
    spelling: str

    def __getitem__(self, declared: TypeForm[T]) -> EventStreamDecoderBuilder[T]:
        ...

@dataclass(frozen=True, slots=True)
class _AsyncEventDecoderFactory(SubscriptOnly):
    read_data: Callable[[TypeAdapter[Any]], Callable[[str], Any]]
    factory_name: str
    spelling: str

    def __getitem__(self, declared: TypeForm[T]) -> AsyncEventStreamDecoderBuilder[T]:
        ...
json_event_decoder: Final = _EventDecoderFactory(_validates_json, 'json_event_decoder', "decoder=json_event_decoder[T](), e.g. json_event_decoder[Chunk](sentinel='[DONE]')")
text_event_decoder: Final = _EventDecoderFactory(_validates_value, 'text_event_decoder', 'decoder=text_event_decoder[T](), e.g. text_event_decoder[str]()')
async_json_event_decoder: Final = _AsyncEventDecoderFactory(_validates_json, 'async_json_event_decoder', 'decoder=async_json_event_decoder[T]()')
async_text_event_decoder: Final = _AsyncEventDecoderFactory(_validates_value, 'async_text_event_decoder', 'decoder=async_text_event_decoder[T]()')
