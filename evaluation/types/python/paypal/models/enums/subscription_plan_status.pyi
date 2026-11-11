from enum import Enum
from typing import Annotated, TypeAlias
from ...core import open_enum_validator

class SubscriptionPlanStatus(str, Enum):
    CREATED = 'CREATED'
    INACTIVE = 'INACTIVE'
    ACTIVE = 'ACTIVE'
    __str__ = str.__str__
SubscriptionPlanStatusOrStr: TypeAlias = Annotated[SubscriptionPlanStatus | str, open_enum_validator(SubscriptionPlanStatus)]
