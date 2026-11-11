from enum import Enum
from typing import Annotated, TypeAlias
from ...core import open_enum_validator

class MobileReturnFlow(str, Enum):
    AUTO = 'AUTO'
    MANUAL = 'MANUAL'
    __str__ = str.__str__
MobileReturnFlowOrStr: TypeAlias = Annotated[MobileReturnFlow | str, open_enum_validator(MobileReturnFlow)]
