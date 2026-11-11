from enum import Enum
from typing import Annotated, TypeAlias
from ...core import open_enum_validator

class VenmoVaultResponseStatus(str, Enum):
    VAULTED = 'VAULTED'
    CREATED = 'CREATED'
    APPROVED = 'APPROVED'
    __str__ = str.__str__
VenmoVaultResponseStatusOrStr: TypeAlias = Annotated[VenmoVaultResponseStatus | str, open_enum_validator(VenmoVaultResponseStatus)]
