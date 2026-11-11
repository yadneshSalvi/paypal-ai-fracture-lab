from __future__ import annotations
from collections.abc import Mapping
from typing import Any, Generic
from typing_extensions import TypeVar
E = TypeVar('E', default=object)

class ApiError(Exception, Generic[E]):

    def __init__(self, error: E, status_code: int, headers: Mapping[str, str]) -> None:
        ...

    def __repr__(self) -> str:
        ...

    def __reduce__(self) -> tuple[type[ApiError[E]], tuple[E, int, Mapping[str, str]], dict[str, Any]]:
        ...

class TransportError(Exception):

    def __init__(self, inner_exception: Exception) -> None:
        ...
