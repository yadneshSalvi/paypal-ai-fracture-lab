from enum import Enum
from typing import Annotated, TypeAlias
from ...core import open_enum_validator

class FulfillmentType(str, Enum):
    SHIPPING = 'SHIPPING'
    PICKUP_IN_PERSON = 'PICKUP_IN_PERSON'
    PICKUP_IN_STORE = 'PICKUP_IN_STORE'
    PICKUP_FROM_PERSON = 'PICKUP_FROM_PERSON'
    __str__ = str.__str__
FulfillmentTypeOrStr: TypeAlias = Annotated[FulfillmentType | str, open_enum_validator(FulfillmentType)]
