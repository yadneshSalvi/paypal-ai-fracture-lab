from enum import Enum
from typing import Annotated, TypeAlias
from ...core import open_enum_validator

class AvsCode(str, Enum):
    A = 'A'
    B = 'B'
    C = 'C'
    D = 'D'
    E = 'E'
    F = 'F'
    G = 'G'
    I_ = 'I'
    M = 'M'
    N = 'N'
    P = 'P'
    R = 'R'
    S = 'S'
    U = 'U'
    W = 'W'
    X = 'X'
    Y = 'Y'
    Z = 'Z'
    NULL = 'Null'
    _0 = '0'
    _1 = '1'
    _2 = '2'
    _3 = '3'
    _4 = '4'
    __str__ = str.__str__
AvsCodeOrStr: TypeAlias = Annotated[AvsCode | str, open_enum_validator(AvsCode)]
