from __future__ import annotations
from typing_extensions import NotRequired, TypedDict
from ..core import UNSET, Optional, SdkBaseModel
from .link_description import LinkDescription, LinkDescriptionDict
from .subscription import Subscription, SubscriptionDict

class SubscriptionCollection(SdkBaseModel):
    subscriptions: Optional[list[Subscription]] = UNSET
    links: Optional[list[LinkDescription]] = UNSET

class SubscriptionCollectionDict(TypedDict):
    subscriptions: NotRequired[list[SubscriptionDict]]
    links: NotRequired[list[LinkDescriptionDict]]
