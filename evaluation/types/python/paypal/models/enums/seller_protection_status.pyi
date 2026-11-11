from enum import Enum
from typing import Annotated, TypeAlias
from ...core import open_enum_validator

class SellerProtectionStatus(str, Enum):
    ELIGIBLE = 'ELIGIBLE'
    PARTIALLY_ELIGIBLE = 'PARTIALLY_ELIGIBLE'
    NOT_ELIGIBLE = 'NOT_ELIGIBLE'
    __str__ = str.__str__
SellerProtectionStatusOrStr: TypeAlias = Annotated[SellerProtectionStatus | str, open_enum_validator(SellerProtectionStatus)]
