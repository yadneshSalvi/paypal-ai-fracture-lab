from enum import Enum
from typing import Annotated, TypeAlias
from ...core import open_enum_validator

class PricingModel(str, Enum):
    FIXED = 'FIXED'
    VARIABLE = 'VARIABLE'
    AUTO_RELOAD = 'AUTO_RELOAD'
    __str__ = str.__str__
PricingModelOrStr: TypeAlias = Annotated[PricingModel | str, open_enum_validator(PricingModel)]
