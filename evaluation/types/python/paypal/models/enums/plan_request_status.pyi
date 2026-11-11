from enum import Enum
from typing import Annotated, TypeAlias
from ...core import open_enum_validator

class PlanRequestStatus(str, Enum):
    CREATED = 'CREATED'
    INACTIVE = 'INACTIVE'
    ACTIVE = 'ACTIVE'
    __str__ = str.__str__
PlanRequestStatusOrStr: TypeAlias = Annotated[PlanRequestStatus | str, open_enum_validator(PlanRequestStatus)]
