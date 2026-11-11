from enum import Enum
from typing import Annotated, TypeAlias
from ...core import open_enum_validator

class SubscriptionPricingModel(str, Enum):
    VOLUME = 'VOLUME'
    TIERED = 'TIERED'
    __str__ = str.__str__
SubscriptionPricingModelOrStr: TypeAlias = Annotated[SubscriptionPricingModel | str, open_enum_validator(SubscriptionPricingModel)]
