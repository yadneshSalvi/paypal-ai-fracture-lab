from __future__ import annotations
import codecs
from collections.abc import Mapping, Sequence
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Final, Generic, TypeAlias, TypeVar, overload
from pydantic import TypeAdapter
from typing_extensions import TypeForm, assert_never
from ._internal.flattening import flatten, to_fields
from ._internal.subscripts import SubscriptOnly
from ._internal.wire import compact_json, to_text
from .adapters import adapter_for, validation_target
from .files import AsyncBinaryContent, AsyncFileInput, NamedFile
from .optionality import strip_unset
from .params import Param
T = TypeVar('T')

@dataclass(frozen=True, slots=True)
class JsonBody(Generic[T]):
    value: object
    media_type: str

@dataclass(frozen=True, slots=True)
class FormBody:
    fields: Mapping[str, str | list[str]]

@dataclass(frozen=True, slots=True)
class MultipartText:
    name: str
    text: str
    media_type: str | None = None

@dataclass(frozen=True, slots=True)
class MultipartFile:
    name: str
    content: AsyncBinaryContent
    filename: str | None
    media_type: str
MultipartPart: TypeAlias = MultipartText | MultipartFile

@dataclass(frozen=True, slots=True)
class MultipartFiles:
    parts: Sequence[MultipartFile]

@dataclass(frozen=True, slots=True)
class MultipartBody:
    parts: Sequence[MultipartPart]

@dataclass(frozen=True, slots=True)
class BinaryBody:
    content: AsyncBinaryContent
    filename: str | None
    media_type: str

@dataclass(frozen=True, slots=True)
class TextBody:
    text: str
    media_type: str
    charset: str
RequestBody: TypeAlias = JsonBody[Any] | FormBody | MultipartBody | BinaryBody | TextBody

def _json_value(adapter: TypeAdapter[T], value: T) -> object:
    ...

def _derive_filename(content: AsyncBinaryContent) -> str | None:
    ...

@dataclass(frozen=True, slots=True)
class _DeclaredJsonBody(Generic[T]):
    adapter: TypeAdapter[T]

    def __call__(self, value: T, /, *, media_type: str='application/json') -> JsonBody[T]:
        ...

class _JsonBodyFactory(SubscriptOnly):
    factory_name = 'json_body'
    spelling = 'json_body[T](value), e.g. json_body[Employee | EmployeeDict](model)'

    def __getitem__(self, declared: TypeForm[T]) -> _DeclaredJsonBody[T]:
        ...
json_body: Final = _JsonBodyFactory()

def form_body(*params: Param[Any]) -> FormBody:
    ...

def multipart_body(*parts: Param[Any] | MultipartPart | MultipartFiles | None) -> MultipartBody:
    ...

def _resolve_file(name: str, value: AsyncFileInput, media_type: str) -> MultipartFile:
    ...

@overload
def file_part(name: str, value: Sequence[AsyncFileInput], *, media_type: str='application/octet-stream') -> MultipartFiles:
    ...

@overload
def file_part(name: str, value: AsyncFileInput, *, media_type: str='application/octet-stream') -> MultipartFile:
    ...

def file_part(name: str, value: AsyncFileInput | Sequence[AsyncFileInput], *, media_type: str='application/octet-stream') -> MultipartFile | MultipartFiles:
    ...

@dataclass(frozen=True, slots=True)
class _DeclaredJsonPart(Generic[T]):
    adapter: TypeAdapter[T]

    def __call__(self, name: str, value: T, /, *, media_type: str='application/json') -> MultipartText:
        ...

class _JsonPartFactory(SubscriptOnly):
    factory_name = 'json_part'
    spelling = 'json_part[T](name, value), e.g. json_part[FileMetadata | FileMetadataDict]("metadata", metadata)'

    def __getitem__(self, declared: TypeForm[T]) -> _DeclaredJsonPart[T]:
        ...
json_part: Final = _JsonPartFactory()

def binary_body(content: AsyncFileInput, *, media_type: str='application/octet-stream') -> BinaryBody:
    ...

@dataclass(frozen=True, slots=True)
class _DeclaredTextBody(Generic[T]):
    adapter: TypeAdapter[T]

    def __call__(self, value: T, /, *, media_type: str='text/plain', charset: str='utf-8') -> TextBody:
        ...

class _TextBodyFactory(SubscriptOnly):
    factory_name = 'text_body'
    spelling = 'text_body[T](value), e.g. text_body[Base64AsciiEncodedBytes](data)'

    def __getitem__(self, declared: TypeForm[T]) -> _DeclaredTextBody[T]:
        ...
text_body: Final = _TextBodyFactory()
