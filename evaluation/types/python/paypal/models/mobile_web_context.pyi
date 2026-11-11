from __future__ import annotations
from typing_extensions import NotRequired, TypedDict
from ..core import UNSET, Optional, SdkBaseModel
from .enums.mobile_return_flow import MobileReturnFlow, MobileReturnFlowOrStr

class MobileWebContext(SdkBaseModel):
    return_flow: MobileReturnFlowOrStr = MobileReturnFlow.AUTO
    buyer_user_agent: Optional[str] = UNSET

class MobileWebContextDict(TypedDict):
    return_flow: NotRequired[MobileReturnFlowOrStr]
    buyer_user_agent: NotRequired[str]
