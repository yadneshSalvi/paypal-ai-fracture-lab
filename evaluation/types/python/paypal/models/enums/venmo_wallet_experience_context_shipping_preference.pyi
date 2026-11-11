from enum import Enum
from typing import Annotated, TypeAlias
from ...core import open_enum_validator

class VenmoWalletExperienceContextShippingPreference(str, Enum):
    GET_FROM_FILE = 'GET_FROM_FILE'
    NO_SHIPPING = 'NO_SHIPPING'
    SET_PROVIDED_ADDRESS = 'SET_PROVIDED_ADDRESS'
    __str__ = str.__str__
VenmoWalletExperienceContextShippingPreferenceOrStr: TypeAlias = Annotated[VenmoWalletExperienceContextShippingPreference | str, open_enum_validator(VenmoWalletExperienceContextShippingPreference)]
