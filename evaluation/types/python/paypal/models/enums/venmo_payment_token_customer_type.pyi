from enum import Enum
from typing import Annotated, TypeAlias
from ...core import open_enum_validator

class VenmoPaymentTokenCustomerType(str, Enum):
    CONSUMER = 'CONSUMER'
    BUSINESS = 'BUSINESS'
    __str__ = str.__str__
VenmoPaymentTokenCustomerTypeOrStr: TypeAlias = Annotated[VenmoPaymentTokenCustomerType | str, open_enum_validator(VenmoPaymentTokenCustomerType)]
