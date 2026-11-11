from enum import Enum
from typing import Annotated, TypeAlias
from ...core import open_enum_validator

class PayPalReferenceIdType(str, Enum):
    ODR = 'ODR'
    TXN = 'TXN'
    SUB = 'SUB'
    PAP = 'PAP'
    __str__ = str.__str__
PayPalReferenceIdTypeOrStr: TypeAlias = Annotated[PayPalReferenceIdType | str, open_enum_validator(PayPalReferenceIdType)]
