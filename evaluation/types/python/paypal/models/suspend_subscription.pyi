from __future__ import annotations
from typing_extensions import TypedDict
from ..core import SdkBaseModel

class SuspendSubscription(SdkBaseModel):
    reason: str

class SuspendSubscriptionDict(TypedDict):
    reason: str
