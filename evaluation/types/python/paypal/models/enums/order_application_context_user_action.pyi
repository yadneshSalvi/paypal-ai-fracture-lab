from enum import Enum
from typing import Annotated, TypeAlias
from ...core import open_enum_validator

class OrderApplicationContextUserAction(str, Enum):
    CONTINUE = 'CONTINUE'
    PAY_NOW = 'PAY_NOW'
    __str__ = str.__str__
OrderApplicationContextUserActionOrStr: TypeAlias = Annotated[OrderApplicationContextUserAction | str, open_enum_validator(OrderApplicationContextUserAction)]
