from __future__ import annotations
from collections.abc import Mapping, Sequence
from typing import Any, Final, TypeAlias
from ..params import Param, SerializationFormat
from .wire import is_collection, to_text, wire_value
Pairs: TypeAlias = list[tuple[str, str]]
_SEPARATORS: Final = {SerializationFormat.CSV: ',', SerializationFormat.TSV: '\t', SerializationFormat.PSV: '|'}

def flatten(params: Sequence[Param[Any]] | None) -> Pairs:
    ...

def to_fields(params: Sequence[Param[Any]]) -> dict[str, str | list[str]]:
    ...

def _flatten_value(*, key: str, value: object, fmt: SerializationFormat) -> Pairs:
    ...

def _try_join(values: Sequence[object], fmt: SerializationFormat) -> str | None:
    ...
