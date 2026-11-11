from __future__ import annotations
import json
from collections.abc import Iterable, Mapping
from typing import Any, TypeGuard
from pydantic import ValidationError
from ..optionality import strip_unset
from ..params import Param

def wire_value(param: Param[Any]) -> object:
    ...

def text_values(param: Param[Any]) -> tuple[str, ...]:
    ...

def to_text(value: object) -> str:
    ...

def parse_json(content: bytes) -> Any:
    ...

def compact_json(value: object) -> str:
    ...

def is_collection(value: object) -> TypeGuard[Iterable[object]]:
    ...
