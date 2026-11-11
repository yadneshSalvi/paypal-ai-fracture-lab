from __future__ import annotations
from typing_extensions import NotRequired, TypedDict
from ..core import UNSET, Optional, SdkBaseModel
from .enums.authorization_incomplete_reason import AuthorizationIncompleteReasonOrStr

class AuthorizationStatusDetails(SdkBaseModel):
    reason: Optional[AuthorizationIncompleteReasonOrStr] = UNSET

class AuthorizationStatusDetailsDict(TypedDict):
    reason: NotRequired[AuthorizationIncompleteReasonOrStr]
