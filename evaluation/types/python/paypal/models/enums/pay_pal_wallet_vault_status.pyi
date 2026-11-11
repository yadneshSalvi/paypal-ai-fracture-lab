from enum import Enum
from typing import Annotated, TypeAlias
from ...core import open_enum_validator

class PayPalWalletVaultStatus(str, Enum):
    VAULTED = 'VAULTED'
    CREATED = 'CREATED'
    APPROVED = 'APPROVED'
    __str__ = str.__str__
PayPalWalletVaultStatusOrStr: TypeAlias = Annotated[PayPalWalletVaultStatus | str, open_enum_validator(PayPalWalletVaultStatus)]
