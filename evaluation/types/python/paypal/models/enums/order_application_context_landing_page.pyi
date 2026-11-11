from enum import Enum
from typing import Annotated, TypeAlias
from ...core import open_enum_validator

class OrderApplicationContextLandingPage(str, Enum):
    LOGIN = 'LOGIN'
    BILLING = 'BILLING'
    NO_PREFERENCE = 'NO_PREFERENCE'
    __str__ = str.__str__
OrderApplicationContextLandingPageOrStr: TypeAlias = Annotated[OrderApplicationContextLandingPage | str, open_enum_validator(OrderApplicationContextLandingPage)]
