from enum import Enum
from typing import Annotated, TypeAlias
from ...core import open_enum_validator

class ExperienceStatus(str, Enum):
    NOT_STARTED = 'NOT_STARTED'
    IN_PROGRESS = 'IN_PROGRESS'
    CANCELED = 'CANCELED'
    APPROVED = 'APPROVED'
    __str__ = str.__str__
ExperienceStatusOrStr: TypeAlias = Annotated[ExperienceStatus | str, open_enum_validator(ExperienceStatus)]
