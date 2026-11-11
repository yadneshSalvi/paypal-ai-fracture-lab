from enum import Enum
from typing import Annotated, TypeAlias
from ...core import open_enum_validator

class StoredPaymentSourcePaymentType(str, Enum):
    ONE_TIME = 'ONE_TIME'
    RECURRING = 'RECURRING'
    UNSCHEDULED = 'UNSCHEDULED'
    __str__ = str.__str__
StoredPaymentSourcePaymentTypeOrStr: TypeAlias = Annotated[StoredPaymentSourcePaymentType | str, open_enum_validator(StoredPaymentSourcePaymentType)]
