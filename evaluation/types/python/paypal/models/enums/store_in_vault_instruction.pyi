from enum import Enum
from typing import Annotated, TypeAlias
from ...core import open_enum_validator

class StoreInVaultInstruction(str, Enum):
    ON_SUCCESS = 'ON_SUCCESS'
    __str__ = str.__str__
StoreInVaultInstructionOrStr: TypeAlias = Annotated[StoreInVaultInstruction | str, open_enum_validator(StoreInVaultInstruction)]
