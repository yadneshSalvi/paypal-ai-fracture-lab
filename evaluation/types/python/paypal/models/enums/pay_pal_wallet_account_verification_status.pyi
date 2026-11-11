from enum import Enum
from typing import Annotated, TypeAlias
from ...core import open_enum_validator

class PayPalWalletAccountVerificationStatus(str, Enum):
    VERIFIED = 'VERIFIED'
    UNVERIFIED = 'UNVERIFIED'
    __str__ = str.__str__
PayPalWalletAccountVerificationStatusOrStr: TypeAlias = Annotated[PayPalWalletAccountVerificationStatus | str, open_enum_validator(PayPalWalletAccountVerificationStatus)]
