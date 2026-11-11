from enum import Enum
from typing import Annotated, TypeAlias
from ...core import open_enum_validator

class IntervalUnit(str, Enum):
    DAY = 'DAY'
    WEEK = 'WEEK'
    MONTH = 'MONTH'
    YEAR = 'YEAR'
    __str__ = str.__str__
IntervalUnitOrStr: TypeAlias = Annotated[IntervalUnit | str, open_enum_validator(IntervalUnit)]
