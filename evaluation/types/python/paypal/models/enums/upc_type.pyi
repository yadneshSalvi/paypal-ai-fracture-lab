from enum import Enum
from typing import Annotated, TypeAlias
from ...core import open_enum_validator

class UpcType(str, Enum):
    UPC_A = 'UPC-A'
    UPC_B = 'UPC-B'
    UPC_C = 'UPC-C'
    UPC_D = 'UPC-D'
    UPC_E = 'UPC-E'
    UPC_2 = 'UPC-2'
    UPC_5 = 'UPC-5'
    __str__ = str.__str__
UpcTypeOrStr: TypeAlias = Annotated[UpcType | str, open_enum_validator(UpcType)]
