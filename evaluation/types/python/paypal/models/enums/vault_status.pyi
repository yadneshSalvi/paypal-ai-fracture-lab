from enum import Enum
from typing import Annotated, TypeAlias
from ...core import open_enum_validator

class VaultStatus(str, Enum):
    VAULTED = 'VAULTED'
    CREATED = 'CREATED'
    APPROVED = 'APPROVED'
    __str__ = str.__str__
VaultStatusOrStr: TypeAlias = Annotated[VaultStatus | str, open_enum_validator(VaultStatus)]
