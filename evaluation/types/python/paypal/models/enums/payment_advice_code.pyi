from enum import Enum
from typing import Annotated, TypeAlias
from ...core import open_enum_validator

class PaymentAdviceCode(str, Enum):
    _01 = '01'
    _02 = '02'
    _03 = '03'
    _04 = '04'
    _21 = '21'
    _22 = '22'
    _24 = '24'
    _25 = '25'
    _26 = '26'
    _27 = '27'
    _28 = '28'
    _29 = '29'
    _30 = '30'
    _40 = '40'
    _43 = '43'
    __str__ = str.__str__
PaymentAdviceCodeOrStr: TypeAlias = Annotated[PaymentAdviceCode | str, open_enum_validator(PaymentAdviceCode)]
