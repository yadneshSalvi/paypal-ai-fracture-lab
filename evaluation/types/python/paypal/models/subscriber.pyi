from __future__ import annotations
from typing_extensions import NotRequired, TypedDict
from ..core import UNSET, Optional, SdkBaseModel
from .name import Name, NameDict
from .shipping_details import ShippingDetails, ShippingDetailsDict
from .subscription_payment_source_response import SubscriptionPaymentSourceResponse, SubscriptionPaymentSourceResponseDict

class Subscriber(SdkBaseModel):
    email_address: Optional[str] = UNSET
    payer_id: Optional[str] = UNSET
    name: Optional[Name] = UNSET
    shipping_address: Optional[ShippingDetails] = UNSET
    payment_source: Optional[SubscriptionPaymentSourceResponse] = UNSET

class SubscriberDict(TypedDict):
    email_address: NotRequired[str]
    payer_id: NotRequired[str]
    name: NotRequired[NameDict]
    shipping_address: NotRequired[ShippingDetailsDict]
    payment_source: NotRequired[SubscriptionPaymentSourceResponseDict]
