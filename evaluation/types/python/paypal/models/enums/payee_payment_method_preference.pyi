from enum import Enum
from typing import Annotated, TypeAlias
from ...core import open_enum_validator

class PayeePaymentMethodPreference(str, Enum):
    UNRESTRICTED = 'UNRESTRICTED'
    IMMEDIATE_PAYMENT_REQUIRED = 'IMMEDIATE_PAYMENT_REQUIRED'
    __str__ = str.__str__
PayeePaymentMethodPreferenceOrStr: TypeAlias = Annotated[PayeePaymentMethodPreference | str, open_enum_validator(PayeePaymentMethodPreference)]
