from __future__ import annotations
from dataclasses import dataclass
from typing import Final, TypeAlias
from ..core import ErrorMapper, RawError, decode_json
from ..models.error import Error
CaptureAuthorizedPaymentErrorBody: TypeAlias = Error | RawError

@dataclass(frozen=True, slots=True)
class _CaptureAuthorizedPaymentError:

    def map(self, status_code: int, content: bytes) -> CaptureAuthorizedPaymentErrorBody:
        ...
capture_authorized_payment_error_mapper: Final[ErrorMapper[CaptureAuthorizedPaymentErrorBody]] = _CaptureAuthorizedPaymentError()
