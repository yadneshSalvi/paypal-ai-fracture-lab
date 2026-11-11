from enum import Enum
from typing import Annotated, TypeAlias
from ...core import open_enum_validator

class ItemCategory(str, Enum):
    DIGITAL_GOODS = 'DIGITAL_GOODS'
    PHYSICAL_GOODS = 'PHYSICAL_GOODS'
    DONATION = 'DONATION'
    __str__ = str.__str__
ItemCategoryOrStr: TypeAlias = Annotated[ItemCategory | str, open_enum_validator(ItemCategory)]
