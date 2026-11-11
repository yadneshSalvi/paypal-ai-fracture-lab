from enum import Enum
from typing import Annotated, TypeAlias
from ...core import open_enum_validator

class PayPalWalletContactPreference(str, Enum):
    NO_CONTACT_INFO = 'NO_CONTACT_INFO'
    UPDATE_CONTACT_INFO = 'UPDATE_CONTACT_INFO'
    RETAIN_CONTACT_INFO = 'RETAIN_CONTACT_INFO'
    __str__ = str.__str__
PayPalWalletContactPreferenceOrStr: TypeAlias = Annotated[PayPalWalletContactPreference | str, open_enum_validator(PayPalWalletContactPreference)]
