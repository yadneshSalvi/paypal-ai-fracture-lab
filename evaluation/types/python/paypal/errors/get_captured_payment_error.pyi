from __future__ import annotations
from dataclasses import dataclass
from typing import Final, TypeAlias
from ..core import ErrorMapper, RawError, decode_json
from ..models.error import Error
GetCapturedPaymentErrorBody: TypeAlias = Error | RawError

@dataclass(frozen=True, slots=True)
class _GetCapturedPaymentError:

    def map(self, status_code: int, content: bytes) -> GetCapturedPaymentErrorBody:
        ...
get_captured_payment_error_mapper: Final[ErrorMapper[GetCapturedPaymentErrorBody]] = _GetCapturedPaymentError()
