from __future__ import annotations
from collections.abc import Sequence
from dataclasses import dataclass
from enum import Enum
from typing import Any, Final, Generic, TypeVar
from pydantic import TypeAdapter
from typing_extensions import TypeForm
from ._internal.subscripts import SubscriptOnly
from .adapters import adapter_for, validation_target
T = TypeVar('T')

class SerializationFormat(Enum):
    INDEXED = 'indexed'
    UNINDEXED = 'unindexed'
    PLAIN = 'plain'
    CSV = 'csv'
    TSV = 'tsv'
    PSV = 'psv'

@dataclass(frozen=True, slots=True)
class Param(Generic[T]):
    key: str
    value: object
    adapter: TypeAdapter[T]
    serialization_format: SerializationFormat = SerializationFormat.INDEXED

@dataclass(frozen=True, slots=True)
class _DeclaredParam(Generic[T]):
    adapter: TypeAdapter[T]

    def __call__(self, key: str, value: T, *, serialization_format: SerializationFormat=SerializationFormat.INDEXED) -> Param[T]:
        ...

class _ParamFactory(SubscriptOnly):
    factory_name = 'param'
    spelling = 'param[T](key, value), e.g. param[bool]("array", True)'

    def __getitem__(self, declared: TypeForm[T]) -> _DeclaredParam[T]:
        ...
param: Final = _ParamFactory()

@dataclass(frozen=True, slots=True)
class UrlTemplate:
    base_url: str
    path: str
    variables: Sequence[Param[Any]] = ()
