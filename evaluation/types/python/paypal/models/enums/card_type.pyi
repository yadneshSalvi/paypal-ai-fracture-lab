from enum import Enum
from typing import Annotated, TypeAlias
from ...core import open_enum_validator

class CardType(str, Enum):
    CREDIT = 'CREDIT'
    DEBIT = 'DEBIT'
    PREPAID = 'PREPAID'
    STORE = 'STORE'
    UNKNOWN = 'UNKNOWN'
    __str__ = str.__str__
CardTypeOrStr: TypeAlias = Annotated[CardType | str, open_enum_validator(CardType)]
