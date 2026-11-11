from enum import Enum
from typing import Annotated, TypeAlias
from ...core import open_enum_validator

class ApplePayPaymentDataType(str, Enum):
    _3_DSECURE = '3DSECURE'
    EMV = 'EMV'
    __str__ = str.__str__
ApplePayPaymentDataTypeOrStr: TypeAlias = Annotated[ApplePayPaymentDataType | str, open_enum_validator(ApplePayPaymentDataType)]
