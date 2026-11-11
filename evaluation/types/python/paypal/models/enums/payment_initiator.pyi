from enum import Enum
from typing import Annotated, TypeAlias
from ...core import open_enum_validator

class PaymentInitiator(str, Enum):
    CUSTOMER = 'CUSTOMER'
    MERCHANT = 'MERCHANT'
    __str__ = str.__str__
PaymentInitiatorOrStr: TypeAlias = Annotated[PaymentInitiator | str, open_enum_validator(PaymentInitiator)]
