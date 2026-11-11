from enum import Enum
from typing import Annotated, TypeAlias
from ...core import open_enum_validator

class OrdersCardVerificationMethod(str, Enum):
    SCA_ALWAYS = 'SCA_ALWAYS'
    SCA_WHEN_REQUIRED = 'SCA_WHEN_REQUIRED'
    _3_D_SECURE = '3D_SECURE'
    AVS_CVV = 'AVS_CVV'
    __str__ = str.__str__
OrdersCardVerificationMethodOrStr: TypeAlias = Annotated[OrdersCardVerificationMethod | str, open_enum_validator(OrdersCardVerificationMethod)]
