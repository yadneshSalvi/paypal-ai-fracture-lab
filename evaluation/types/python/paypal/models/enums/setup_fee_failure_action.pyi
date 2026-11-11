from enum import Enum
from typing import Annotated, TypeAlias
from ...core import open_enum_validator

class SetupFeeFailureAction(str, Enum):
    CONTINUE = 'CONTINUE'
    CANCEL = 'CANCEL'
    __str__ = str.__str__
SetupFeeFailureActionOrStr: TypeAlias = Annotated[SetupFeeFailureAction | str, open_enum_validator(SetupFeeFailureAction)]
