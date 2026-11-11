from enum import Enum
from typing import Annotated, TypeAlias
from ...core import open_enum_validator

class EnrollmentStatus(str, Enum):
    Y = 'Y'
    N = 'N'
    U = 'U'
    B = 'B'
    __str__ = str.__str__
EnrollmentStatusOrStr: TypeAlias = Annotated[EnrollmentStatus | str, open_enum_validator(EnrollmentStatus)]
