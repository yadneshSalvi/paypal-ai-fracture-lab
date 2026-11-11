from __future__ import annotations
from dataclasses import dataclass
from typing import Final, TypeAlias
from ..core import ErrorMapper, RawError, decode_json
from ..models.error import Error
GetRefundErrorBody: TypeAlias = Error | RawError

@dataclass(frozen=True, slots=True)
class _GetRefundError:

    def map(self, status_code: int, content: bytes) -> GetRefundErrorBody:
        ...
get_refund_error_mapper: Final[ErrorMapper[GetRefundErrorBody]] = _GetRefundError()
