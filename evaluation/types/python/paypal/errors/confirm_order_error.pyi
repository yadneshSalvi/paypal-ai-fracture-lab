from __future__ import annotations
from dataclasses import dataclass
from typing import Final, TypeAlias
from ..core import ErrorMapper, RawError, decode_json
from ..models.error import Error
ConfirmOrderErrorBody: TypeAlias = Error | RawError

@dataclass(frozen=True, slots=True)
class _ConfirmOrderError:

    def map(self, status_code: int, content: bytes) -> ConfirmOrderErrorBody:
        ...
confirm_order_error_mapper: Final[ErrorMapper[ConfirmOrderErrorBody]] = _ConfirmOrderError()
