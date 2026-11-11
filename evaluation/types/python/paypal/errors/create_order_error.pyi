from __future__ import annotations
from dataclasses import dataclass
from typing import Final, TypeAlias
from ..core import ErrorMapper, RawError, decode_json
from ..models.error import Error
CreateOrderErrorBody: TypeAlias = Error | RawError

@dataclass(frozen=True, slots=True)
class _CreateOrderError:

    def map(self, status_code: int, content: bytes) -> CreateOrderErrorBody:
        ...
create_order_error_mapper: Final[ErrorMapper[CreateOrderErrorBody]] = _CreateOrderError()
