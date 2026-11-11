from enum import Enum
from typing import Annotated, TypeAlias
from ...core import open_enum_validator

class ReturnFlow(str, Enum):
    AUTO = 'AUTO'
    MANUAL = 'MANUAL'
    __str__ = str.__str__
ReturnFlowOrStr: TypeAlias = Annotated[ReturnFlow | str, open_enum_validator(ReturnFlow)]
