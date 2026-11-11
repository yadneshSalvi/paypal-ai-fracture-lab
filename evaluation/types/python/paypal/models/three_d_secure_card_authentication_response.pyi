from __future__ import annotations
from typing_extensions import NotRequired, TypedDict
from ..core import UNSET, Optional, SdkBaseModel
from .enums.enrollment_status import EnrollmentStatusOrStr
from .enums.pares_status import ParesStatusOrStr

class ThreeDSecureCardAuthenticationResponse(SdkBaseModel):
    authentication_status: Optional[ParesStatusOrStr] = UNSET
    enrollment_status: Optional[EnrollmentStatusOrStr] = UNSET
    authentication_id: Optional[str] = UNSET

class ThreeDSecureCardAuthenticationResponseDict(TypedDict):
    authentication_status: NotRequired[ParesStatusOrStr]
    enrollment_status: NotRequired[EnrollmentStatusOrStr]
    authentication_id: NotRequired[str]
