from enum import Enum
from typing import Annotated, TypeAlias
from ...core import open_enum_validator

class UsageType(str, Enum):
    MERCHANT = 'MERCHANT'
    PLATFORM = 'PLATFORM'
    __str__ = str.__str__
UsageTypeOrStr: TypeAlias = Annotated[UsageType | str, open_enum_validator(UsageType)]
