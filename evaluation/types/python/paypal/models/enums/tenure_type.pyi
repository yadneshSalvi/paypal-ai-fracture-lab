from enum import Enum
from typing import Annotated, TypeAlias
from ...core import open_enum_validator

class TenureType(str, Enum):
    REGULAR = 'REGULAR'
    TRIAL = 'TRIAL'
    __str__ = str.__str__
TenureTypeOrStr: TypeAlias = Annotated[TenureType | str, open_enum_validator(TenureType)]
