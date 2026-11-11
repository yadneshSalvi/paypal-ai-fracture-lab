from enum import Enum
from typing import Annotated, TypeAlias
from ...core import open_enum_validator

class PayPalPaymentTokenUsageType(str, Enum):
    MERCHANT = 'MERCHANT'
    PLATFORM = 'PLATFORM'
    __str__ = str.__str__
PayPalPaymentTokenUsageTypeOrStr: TypeAlias = Annotated[PayPalPaymentTokenUsageType | str, open_enum_validator(PayPalPaymentTokenUsageType)]
