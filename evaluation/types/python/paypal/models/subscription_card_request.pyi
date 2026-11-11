from __future__ import annotations
from pydantic import Field
from typing_extensions import NotRequired, TypedDict
from ..core import UNSET, Optional, SdkBaseModel
from .address import Address, AddressDict
from .enums.card_type import CardTypeOrStr
from .enums.subscriptions_card_brand import SubscriptionsCardBrandOrStr
from .subscriptions_card_attributes import SubscriptionsCardAttributes, SubscriptionsCardAttributesDict

class SubscriptionCardRequest(SdkBaseModel):
    name: Optional[str] = UNSET
    number: Optional[str] = UNSET
    expiry: Optional[str] = UNSET
    security_code: Optional[str] = UNSET
    type_: Optional[CardTypeOrStr] = Field(default=UNSET, alias='type')
    brand: Optional[SubscriptionsCardBrandOrStr] = UNSET
    billing_address: Optional[Address] = UNSET
    attributes: Optional[SubscriptionsCardAttributes] = UNSET

class SubscriptionCardRequestDict(TypedDict):
    name: NotRequired[str]
    number: NotRequired[str]
    expiry: NotRequired[str]
    security_code: NotRequired[str]
    type_: NotRequired[CardTypeOrStr]
    brand: NotRequired[SubscriptionsCardBrandOrStr]
    billing_address: NotRequired[AddressDict]
    attributes: NotRequired[SubscriptionsCardAttributesDict]
