from enum import Enum
from typing import Annotated, TypeAlias
from ...core import open_enum_validator

class PayPalWalletContextShippingPreference(str, Enum):
    GET_FROM_FILE = 'GET_FROM_FILE'
    NO_SHIPPING = 'NO_SHIPPING'
    SET_PROVIDED_ADDRESS = 'SET_PROVIDED_ADDRESS'
    __str__ = str.__str__
PayPalWalletContextShippingPreferenceOrStr: TypeAlias = Annotated[PayPalWalletContextShippingPreference | str, open_enum_validator(PayPalWalletContextShippingPreference)]
