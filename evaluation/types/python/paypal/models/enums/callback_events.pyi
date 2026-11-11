from enum import Enum
from typing import Annotated, TypeAlias
from ...core import open_enum_validator

class CallbackEvents(str, Enum):
    SHIPPING_ADDRESS = 'SHIPPING_ADDRESS'
    SHIPPING_OPTIONS = 'SHIPPING_OPTIONS'
    __str__ = str.__str__
CallbackEventsOrStr: TypeAlias = Annotated[CallbackEvents | str, open_enum_validator(CallbackEvents)]
