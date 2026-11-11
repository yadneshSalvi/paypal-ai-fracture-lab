from enum import Enum
from typing import Annotated, TypeAlias
from ...core import open_enum_validator

class VaultUserAction(str, Enum):
    SETUP_NOW = 'SETUP_NOW'
    CONTINUE = 'CONTINUE'
    __str__ = str.__str__
VaultUserActionOrStr: TypeAlias = Annotated[VaultUserAction | str, open_enum_validator(VaultUserAction)]
