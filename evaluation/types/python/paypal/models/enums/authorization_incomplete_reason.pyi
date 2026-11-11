from enum import Enum
from typing import Annotated, TypeAlias
from ...core import open_enum_validator

class AuthorizationIncompleteReason(str, Enum):
    PENDING_REVIEW = 'PENDING_REVIEW'
    DECLINED_BY_RISK_FRAUD_FILTERS = 'DECLINED_BY_RISK_FRAUD_FILTERS'
    __str__ = str.__str__
AuthorizationIncompleteReasonOrStr: TypeAlias = Annotated[AuthorizationIncompleteReason | str, open_enum_validator(AuthorizationIncompleteReason)]
