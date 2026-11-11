from enum import Enum
from typing import Annotated, TypeAlias
from ...core import open_enum_validator

class GooglePayAuthenticationMethod(str, Enum):
    PAN_ONLY = 'PAN_ONLY'
    CRYPTOGRAM_3_DS = 'CRYPTOGRAM_3DS'
    __str__ = str.__str__
GooglePayAuthenticationMethodOrStr: TypeAlias = Annotated[GooglePayAuthenticationMethod | str, open_enum_validator(GooglePayAuthenticationMethod)]
