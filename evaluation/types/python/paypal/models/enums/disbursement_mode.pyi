from enum import Enum
from typing import Annotated, TypeAlias
from ...core import open_enum_validator

class DisbursementMode(str, Enum):
    INSTANT = 'INSTANT'
    DELAYED = 'DELAYED'
    __str__ = str.__str__
DisbursementModeOrStr: TypeAlias = Annotated[DisbursementMode | str, open_enum_validator(DisbursementMode)]
