from __future__ import annotations
from dataclasses import dataclass
from typing import Final, TypeAlias
from ..core import ErrorMapper, RawError, decode_json
from ..models.error import Error
ReauthorizePaymentErrorBody: TypeAlias = Error | RawError

@dataclass(frozen=True, slots=True)
class _ReauthorizePaymentError:

    def map(self, status_code: int, content: bytes) -> ReauthorizePaymentErrorBody:
        ...
reauthorize_payment_error_mapper: Final[ErrorMapper[ReauthorizePaymentErrorBody]] = _ReauthorizePaymentError()
