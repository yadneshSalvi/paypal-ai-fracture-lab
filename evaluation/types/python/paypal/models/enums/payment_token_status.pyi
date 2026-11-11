from enum import Enum
from typing import Annotated, TypeAlias
from ...core import open_enum_validator

class PaymentTokenStatus(str, Enum):
    CREATED = 'CREATED'
    PAYER_ACTION_REQUIRED = 'PAYER_ACTION_REQUIRED'
    APPROVED = 'APPROVED'
    VAULTED = 'VAULTED'
    TOKENIZED = 'TOKENIZED'
    __str__ = str.__str__
PaymentTokenStatusOrStr: TypeAlias = Annotated[PaymentTokenStatus | str, open_enum_validator(PaymentTokenStatus)]
