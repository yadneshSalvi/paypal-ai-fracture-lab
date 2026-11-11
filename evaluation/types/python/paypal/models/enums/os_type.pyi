from enum import Enum
from typing import Annotated, TypeAlias
from ...core import open_enum_validator

class OsType(str, Enum):
    ANDROID = 'ANDROID'
    IOS = 'IOS'
    OTHER = 'OTHER'
    __str__ = str.__str__
OsTypeOrStr: TypeAlias = Annotated[OsType | str, open_enum_validator(OsType)]
