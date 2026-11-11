from enum import Enum
from typing import Annotated, TypeAlias
from ...core import open_enum_validator

class ParesStatus(str, Enum):
    Y = 'Y'
    N = 'N'
    U = 'U'
    A = 'A'
    C = 'C'
    R = 'R'
    D = 'D'
    I_ = 'I'
    __str__ = str.__str__
ParesStatusOrStr: TypeAlias = Annotated[ParesStatus | str, open_enum_validator(ParesStatus)]
