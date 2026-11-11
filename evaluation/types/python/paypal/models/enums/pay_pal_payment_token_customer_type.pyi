from enum import Enum
from typing import Annotated, TypeAlias
from ...core import open_enum_validator

class PayPalPaymentTokenCustomerType(str, Enum):
    CONSUMER = 'CONSUMER'
    BUSINESS = 'BUSINESS'
    __str__ = str.__str__
PayPalPaymentTokenCustomerTypeOrStr: TypeAlias = Annotated[PayPalPaymentTokenCustomerType | str, open_enum_validator(PayPalPaymentTokenCustomerType)]
