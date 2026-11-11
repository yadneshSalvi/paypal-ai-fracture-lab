from enum import Enum
from typing import Annotated, TypeAlias
from ...core import open_enum_validator

class RefundStatus(str, Enum):
    CANCELLED = 'CANCELLED'
    FAILED = 'FAILED'
    PENDING = 'PENDING'
    COMPLETED = 'COMPLETED'
    __str__ = str.__str__
RefundStatusOrStr: TypeAlias = Annotated[RefundStatus | str, open_enum_validator(RefundStatus)]
