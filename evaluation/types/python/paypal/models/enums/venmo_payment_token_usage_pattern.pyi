from enum import Enum
from typing import Annotated, TypeAlias
from ...core import open_enum_validator

class VenmoPaymentTokenUsagePattern(str, Enum):
    IMMEDIATE = 'IMMEDIATE'
    DEFERRED = 'DEFERRED'
    RECURRING_PREPAID = 'RECURRING_PREPAID'
    RECURRING_POSTPAID = 'RECURRING_POSTPAID'
    THRESHOLD_PREPAID = 'THRESHOLD_PREPAID'
    THRESHOLD_POSTPAID = 'THRESHOLD_POSTPAID'
    __str__ = str.__str__
VenmoPaymentTokenUsagePatternOrStr: TypeAlias = Annotated[VenmoPaymentTokenUsagePattern | str, open_enum_validator(VenmoPaymentTokenUsagePattern)]
