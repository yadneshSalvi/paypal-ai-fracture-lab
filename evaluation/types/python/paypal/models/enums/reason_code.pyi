from enum import Enum
from typing import Annotated, TypeAlias
from ...core import open_enum_validator

class ReasonCode(str, Enum):
    PAYMENT_DENIED = 'PAYMENT_DENIED'
    INTERNAL_SERVER_ERROR = 'INTERNAL_SERVER_ERROR'
    PAYEE_ACCOUNT_RESTRICTED = 'PAYEE_ACCOUNT_RESTRICTED'
    PAYER_ACCOUNT_RESTRICTED = 'PAYER_ACCOUNT_RESTRICTED'
    PAYER_CANNOT_PAY = 'PAYER_CANNOT_PAY'
    SENDING_LIMIT_EXCEEDED = 'SENDING_LIMIT_EXCEEDED'
    TRANSACTION_RECEIVING_LIMIT_EXCEEDED = 'TRANSACTION_RECEIVING_LIMIT_EXCEEDED'
    CURRENCY_MISMATCH = 'CURRENCY_MISMATCH'
    __str__ = str.__str__
ReasonCodeOrStr: TypeAlias = Annotated[ReasonCode | str, open_enum_validator(ReasonCode)]
