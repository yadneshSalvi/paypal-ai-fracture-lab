from enum import Enum
from typing import Annotated, TypeAlias
from ...core import open_enum_validator

class ShippingType(str, Enum):
    SHIPPING = 'SHIPPING'
    PICKUP = 'PICKUP'
    PICKUP_IN_STORE = 'PICKUP_IN_STORE'
    PICKUP_FROM_PERSON = 'PICKUP_FROM_PERSON'
    __str__ = str.__str__
ShippingTypeOrStr: TypeAlias = Annotated[ShippingType | str, open_enum_validator(ShippingType)]
