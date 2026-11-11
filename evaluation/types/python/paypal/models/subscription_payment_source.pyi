from __future__ import annotations
from typing_extensions import NotRequired, TypedDict
from ..core import UNSET, Optional, SdkBaseModel
from .subscription_card_request import SubscriptionCardRequest, SubscriptionCardRequestDict

class SubscriptionPaymentSource(SdkBaseModel):
    card: Optional[SubscriptionCardRequest] = UNSET

class SubscriptionPaymentSourceDict(TypedDict):
    card: NotRequired[SubscriptionCardRequestDict]
