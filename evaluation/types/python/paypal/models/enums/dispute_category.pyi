from enum import Enum
from typing import Annotated, TypeAlias
from ...core import open_enum_validator

class DisputeCategory(str, Enum):
    ITEM_NOT_RECEIVED = 'ITEM_NOT_RECEIVED'
    UNAUTHORIZED_TRANSACTION = 'UNAUTHORIZED_TRANSACTION'
    __str__ = str.__str__
DisputeCategoryOrStr: TypeAlias = Annotated[DisputeCategory | str, open_enum_validator(DisputeCategory)]
