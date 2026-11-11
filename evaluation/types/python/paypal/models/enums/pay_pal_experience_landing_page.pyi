from enum import Enum
from typing import Annotated, TypeAlias
from ...core import open_enum_validator

class PayPalExperienceLandingPage(str, Enum):
    LOGIN = 'LOGIN'
    GUEST_CHECKOUT = 'GUEST_CHECKOUT'
    NO_PREFERENCE = 'NO_PREFERENCE'
    BILLING = 'BILLING'
    __str__ = str.__str__
PayPalExperienceLandingPageOrStr: TypeAlias = Annotated[PayPalExperienceLandingPage | str, open_enum_validator(PayPalExperienceLandingPage)]
