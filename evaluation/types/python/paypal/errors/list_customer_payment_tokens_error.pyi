from __future__ import annotations
from dataclasses import dataclass
from typing import Final, TypeAlias
from ..core import ErrorMapper, RawError, decode_json
from ..models.error import Error
ListCustomerPaymentTokensErrorBody: TypeAlias = Error | RawError

@dataclass(frozen=True, slots=True)
class _ListCustomerPaymentTokensError:

    def map(self, status_code: int, content: bytes) -> ListCustomerPaymentTokensErrorBody:
        ...
list_customer_payment_tokens_error_mapper: Final[ErrorMapper[ListCustomerPaymentTokensErrorBody]] = _ListCustomerPaymentTokensError()
