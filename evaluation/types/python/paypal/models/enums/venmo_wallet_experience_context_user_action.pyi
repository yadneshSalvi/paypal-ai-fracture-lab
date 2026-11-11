from enum import Enum
from typing import Annotated, TypeAlias
from ...core import open_enum_validator

class VenmoWalletExperienceContextUserAction(str, Enum):
    CONTINUE = 'CONTINUE'
    PAY_NOW = 'PAY_NOW'
    __str__ = str.__str__
VenmoWalletExperienceContextUserActionOrStr: TypeAlias = Annotated[VenmoWalletExperienceContextUserAction | str, open_enum_validator(VenmoWalletExperienceContextUserAction)]
