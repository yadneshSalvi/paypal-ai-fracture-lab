from enum import Enum
from typing import Annotated, TypeAlias
from ...core import open_enum_validator

class RefundIncompleteReason(str, Enum):
    ECHECK = 'ECHECK'
    __str__ = str.__str__
RefundIncompleteReasonOrStr: TypeAlias = Annotated[RefundIncompleteReason | str, open_enum_validator(RefundIncompleteReason)]
