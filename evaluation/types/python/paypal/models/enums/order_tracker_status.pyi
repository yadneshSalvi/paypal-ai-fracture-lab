from enum import Enum
from typing import Annotated, TypeAlias
from ...core import open_enum_validator

class OrderTrackerStatus(str, Enum):
    CANCELLED = 'CANCELLED'
    SHIPPED = 'SHIPPED'
    __str__ = str.__str__
OrderTrackerStatusOrStr: TypeAlias = Annotated[OrderTrackerStatus | str, open_enum_validator(OrderTrackerStatus)]
