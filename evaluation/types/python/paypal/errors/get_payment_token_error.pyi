from __future__ import annotations
from dataclasses import dataclass
from typing import Final, TypeAlias
from ..core import ErrorMapper, RawError, decode_json
from ..models.error import Error
GetPaymentTokenErrorBody: TypeAlias = Error | RawError

@dataclass(frozen=True, slots=True)
class _GetPaymentTokenError:

    def map(self, status_code: int, content: bytes) -> GetPaymentTokenErrorBody:
        ...
get_payment_token_error_mapper: Final[ErrorMapper[GetPaymentTokenErrorBody]] = _GetPaymentTokenError()
