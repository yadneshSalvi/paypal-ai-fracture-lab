from enum import Enum
from typing import Annotated, TypeAlias
from ...core import open_enum_validator

class CheckoutPaymentIntent(str, Enum):
    CAPTURE = 'CAPTURE'
    AUTHORIZE = 'AUTHORIZE'
    __str__ = str.__str__
CheckoutPaymentIntentOrStr: TypeAlias = Annotated[CheckoutPaymentIntent | str, open_enum_validator(CheckoutPaymentIntent)]
