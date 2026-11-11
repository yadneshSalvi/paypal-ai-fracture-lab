from enum import Enum
from typing import Annotated, TypeAlias
from ...core import open_enum_validator

class VaultTokenRequestType(str, Enum):
    SETUP_TOKEN = 'SETUP_TOKEN'
    __str__ = str.__str__
VaultTokenRequestTypeOrStr: TypeAlias = Annotated[VaultTokenRequestType | str, open_enum_validator(VaultTokenRequestType)]
