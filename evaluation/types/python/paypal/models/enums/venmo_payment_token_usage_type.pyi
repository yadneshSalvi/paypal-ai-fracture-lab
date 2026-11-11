from enum import Enum
from typing import Annotated, TypeAlias
from ...core import open_enum_validator

class VenmoPaymentTokenUsageType(str, Enum):
    MERCHANT = 'MERCHANT'
    PLATFORM = 'PLATFORM'
    __str__ = str.__str__
VenmoPaymentTokenUsageTypeOrStr: TypeAlias = Annotated[VenmoPaymentTokenUsageType | str, open_enum_validator(VenmoPaymentTokenUsageType)]
