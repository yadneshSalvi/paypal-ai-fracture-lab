from __future__ import annotations
from typing_extensions import NotRequired, TypedDict
from ..core import UNSET, Optional, SdkBaseModel

class ActivateSubscriptionRequest(SdkBaseModel):
    reason: Optional[str] = UNSET

class ActivateSubscriptionRequestDict(TypedDict):
    reason: NotRequired[str]
