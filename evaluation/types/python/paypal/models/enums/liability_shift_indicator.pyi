from enum import Enum
from typing import Annotated, TypeAlias
from ...core import open_enum_validator

class LiabilityShiftIndicator(str, Enum):
    NO = 'NO'
    POSSIBLE = 'POSSIBLE'
    UNKNOWN = 'UNKNOWN'
    __str__ = str.__str__
LiabilityShiftIndicatorOrStr: TypeAlias = Annotated[LiabilityShiftIndicator | str, open_enum_validator(LiabilityShiftIndicator)]
