from __future__ import annotations
from collections.abc import Mapping, Sequence
from typing import Any, Final, TypeVar
from pydantic import ValidationError
from typing_extensions import TypeForm
from ..adapters import adapter_for, validation_target
from ..params import Param
from .wire import text_values
T = TypeVar('T')
COOKIE_HEADER: Final = 'cookie'

def fold_cookie_jars(*jars: str | None) -> str:
    ...

def render_headers(headers: Sequence[Param[Any]] | None) -> dict[str, str]:
    ...

def normalize_headers(headers: Mapping[str, str] | None) -> dict[str, str]:
    ...

def resolve_headers(global_headers: Sequence[Param[Any]], local_headers: Sequence[Param[Any]] | None, *, extra_headers: Mapping[str, str] | None=None) -> dict[str, str]:
    ...

def read_header(headers: Mapping[str, str], name: str, declared: TypeForm[T]) -> T | None:
    ...

def find_link_target(headers: Mapping[str, str], rel: str) -> str | None:
    ...

def find_header(headers: Mapping[str, str], name: str) -> str | None:
    ...

def _find_unquoted(text: str, delimiter: str, start: int) -> int:
    ...

def _rel_matches(parameters: str, rel: str) -> bool:
    ...
