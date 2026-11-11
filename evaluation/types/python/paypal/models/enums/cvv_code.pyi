from enum import Enum
from typing import Annotated, TypeAlias
from ...core import open_enum_validator

class CvvCode(str, Enum):
    E = 'E'
    I_ = 'I'
    M = 'M'
    N = 'N'
    P = 'P'
    S = 'S'
    U = 'U'
    X = 'X'
    ALL_OTHERS = 'All others'
    _0 = '0'
    _1 = '1'
    _2 = '2'
    _3 = '3'
    _4 = '4'
    __str__ = str.__str__
CvvCodeOrStr: TypeAlias = Annotated[CvvCode | str, open_enum_validator(CvvCode)]
