from __future__ import annotations
from typing_extensions import NotRequired, TypedDict
from ..core import UNSET, Optional, SdkBaseModel
from .three_d_secure_card_authentication_response import ThreeDSecureCardAuthenticationResponse, ThreeDSecureCardAuthenticationResponseDict

class CardAuthenticationResponse(SdkBaseModel):
    three_d_secure: Optional[ThreeDSecureCardAuthenticationResponse] = UNSET

class CardAuthenticationResponseDict(TypedDict):
    three_d_secure: NotRequired[ThreeDSecureCardAuthenticationResponseDict]
