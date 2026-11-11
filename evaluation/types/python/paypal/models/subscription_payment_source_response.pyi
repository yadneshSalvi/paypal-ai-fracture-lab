from __future__ import annotations
from typing_extensions import NotRequired, TypedDict
from ..core import UNSET, Optional, SdkBaseModel
from .card_response_with_billing_address import CardResponseWithBillingAddress, CardResponseWithBillingAddressDict

class SubscriptionPaymentSourceResponse(SdkBaseModel):
    card: Optional[CardResponseWithBillingAddress] = UNSET

class SubscriptionPaymentSourceResponseDict(TypedDict):
    card: NotRequired[CardResponseWithBillingAddressDict]
