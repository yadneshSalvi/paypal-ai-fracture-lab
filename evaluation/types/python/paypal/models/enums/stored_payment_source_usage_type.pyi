from enum import Enum
from typing import Annotated, TypeAlias
from ...core import open_enum_validator

class StoredPaymentSourceUsageType(str, Enum):
    FIRST = 'FIRST'
    SUBSEQUENT = 'SUBSEQUENT'
    DERIVED = 'DERIVED'
    __str__ = str.__str__
StoredPaymentSourceUsageTypeOrStr: TypeAlias = Annotated[StoredPaymentSourceUsageType | str, open_enum_validator(StoredPaymentSourceUsageType)]
