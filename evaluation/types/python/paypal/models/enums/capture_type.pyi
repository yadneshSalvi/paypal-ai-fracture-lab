from enum import Enum
from typing import Annotated, TypeAlias
from ...core import open_enum_validator

class CaptureType(str, Enum):
    OUTSTANDING_BALANCE = 'OUTSTANDING_BALANCE'
    __str__ = str.__str__
CaptureTypeOrStr: TypeAlias = Annotated[CaptureType | str, open_enum_validator(CaptureType)]
