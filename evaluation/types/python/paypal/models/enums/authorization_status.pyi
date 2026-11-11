from enum import Enum
from typing import Annotated, TypeAlias
from ...core import open_enum_validator

class AuthorizationStatus(str, Enum):
    CREATED = 'CREATED'
    CAPTURED = 'CAPTURED'
    DENIED = 'DENIED'
    PARTIALLY_CAPTURED = 'PARTIALLY_CAPTURED'
    VOIDED = 'VOIDED'
    PENDING = 'PENDING'
    __str__ = str.__str__
AuthorizationStatusOrStr: TypeAlias = Annotated[AuthorizationStatus | str, open_enum_validator(AuthorizationStatus)]
