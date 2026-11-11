from enum import Enum
from typing import Annotated, TypeAlias
from ...core import open_enum_validator

class OrderStatus(str, Enum):
    CREATED = 'CREATED'
    SAVED = 'SAVED'
    APPROVED = 'APPROVED'
    VOIDED = 'VOIDED'
    COMPLETED = 'COMPLETED'
    PAYER_ACTION_REQUIRED = 'PAYER_ACTION_REQUIRED'
    __str__ = str.__str__
OrderStatusOrStr: TypeAlias = Annotated[OrderStatus | str, open_enum_validator(OrderStatus)]
