from enum import Enum
from typing import Annotated, TypeAlias
from ...core import open_enum_validator

class ApplicationContextUserAction(str, Enum):
    CONTINUE = 'CONTINUE'
    SUBSCRIBE_NOW = 'SUBSCRIBE_NOW'
    __str__ = str.__str__
ApplicationContextUserActionOrStr: TypeAlias = Annotated[ApplicationContextUserAction | str, open_enum_validator(ApplicationContextUserAction)]
