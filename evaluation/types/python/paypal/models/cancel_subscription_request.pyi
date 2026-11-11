from __future__ import annotations
from typing_extensions import TypedDict
from ..core import SdkBaseModel

class CancelSubscriptionRequest(SdkBaseModel):
    reason: str

class CancelSubscriptionRequestDict(TypedDict):
    reason: str
