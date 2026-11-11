from enum import Enum
from typing import Annotated, TypeAlias
from ...core import open_enum_validator

class CaptureStatus(str, Enum):
    COMPLETED = 'COMPLETED'
    DECLINED = 'DECLINED'
    PARTIALLY_REFUNDED = 'PARTIALLY_REFUNDED'
    PENDING = 'PENDING'
    REFUNDED = 'REFUNDED'
    FAILED = 'FAILED'
    __str__ = str.__str__
CaptureStatusOrStr: TypeAlias = Annotated[CaptureStatus | str, open_enum_validator(CaptureStatus)]
