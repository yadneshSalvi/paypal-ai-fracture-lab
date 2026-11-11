from enum import Enum
from typing import Annotated, TypeAlias
from ...core import open_enum_validator

class PayPalExperienceUserAction(str, Enum):
    CONTINUE = 'CONTINUE'
    PAY_NOW = 'PAY_NOW'
    __str__ = str.__str__
PayPalExperienceUserActionOrStr: TypeAlias = Annotated[PayPalExperienceUserAction | str, open_enum_validator(PayPalExperienceUserAction)]
