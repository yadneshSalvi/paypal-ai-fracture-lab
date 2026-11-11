from __future__ import annotations
from dataclasses import dataclass
from typing import Final, TypeAlias
from ..core import ErrorMapper, RawError, decode_json
from ..models.error import Error
VoidPaymentErrorBody: TypeAlias = Error | RawError

@dataclass(frozen=True, slots=True)
class _VoidPaymentError:

    def map(self, status_code: int, content: bytes) -> VoidPaymentErrorBody:
        ...
void_payment_error_mapper: Final[ErrorMapper[VoidPaymentErrorBody]] = _VoidPaymentError()
