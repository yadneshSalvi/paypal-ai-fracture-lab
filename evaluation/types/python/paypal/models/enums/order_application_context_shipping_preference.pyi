from enum import Enum
from typing import Annotated, TypeAlias
from ...core import open_enum_validator

class OrderApplicationContextShippingPreference(str, Enum):
    GET_FROM_FILE = 'GET_FROM_FILE'
    NO_SHIPPING = 'NO_SHIPPING'
    SET_PROVIDED_ADDRESS = 'SET_PROVIDED_ADDRESS'
    __str__ = str.__str__
OrderApplicationContextShippingPreferenceOrStr: TypeAlias = Annotated[OrderApplicationContextShippingPreference | str, open_enum_validator(OrderApplicationContextShippingPreference)]
