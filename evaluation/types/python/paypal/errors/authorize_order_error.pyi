from __future__ import annotations
from dataclasses import dataclass
from typing import Final, TypeAlias
from ..core import ErrorMapper, RawError, decode_json
from ..models.error import Error
AuthorizeOrderErrorBody: TypeAlias = Error | RawError

@dataclass(frozen=True, slots=True)
class _AuthorizeOrderError:

    def map(self, status_code: int, content: bytes) -> AuthorizeOrderErrorBody:
        ...
authorize_order_error_mapper: Final[ErrorMapper[AuthorizeOrderErrorBody]] = _AuthorizeOrderError()
