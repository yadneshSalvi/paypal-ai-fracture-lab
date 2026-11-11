from __future__ import annotations
from typing_extensions import NotRequired, TypedDict
from ..core import UNSET, Optional, SdkBaseModel
from .enums.liability_shift_indicator import LiabilityShiftIndicatorOrStr
from .three_d_secure_authentication_response import ThreeDSecureAuthenticationResponse, ThreeDSecureAuthenticationResponseDict

class AuthenticationResponse(SdkBaseModel):
    liability_shift: Optional[LiabilityShiftIndicatorOrStr] = UNSET
    three_d_secure: Optional[ThreeDSecureAuthenticationResponse] = UNSET

class AuthenticationResponseDict(TypedDict):
    liability_shift: NotRequired[LiabilityShiftIndicatorOrStr]
    three_d_secure: NotRequired[ThreeDSecureAuthenticationResponseDict]
