from enum import Enum
from typing import Annotated, TypeAlias
from ...core import open_enum_validator

class GooglePayPaymentMethod(str, Enum):
    CARD = 'CARD'
    __str__ = str.__str__
GooglePayPaymentMethodOrStr: TypeAlias = Annotated[GooglePayPaymentMethod | str, open_enum_validator(GooglePayPaymentMethod)]
