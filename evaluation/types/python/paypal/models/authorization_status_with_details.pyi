from __future__ import annotations
from typing_extensions import NotRequired, TypedDict
from ..core import UNSET, Optional, SdkBaseModel
from .authorization_status_details import AuthorizationStatusDetails, AuthorizationStatusDetailsDict
from .enums.authorization_status import AuthorizationStatusOrStr

class AuthorizationStatusWithDetails(SdkBaseModel):
    status: Optional[AuthorizationStatusOrStr] = UNSET
    status_details: Optional[AuthorizationStatusDetails] = UNSET

class AuthorizationStatusWithDetailsDict(TypedDict):
    status: NotRequired[AuthorizationStatusOrStr]
    status_details: NotRequired[AuthorizationStatusDetailsDict]
