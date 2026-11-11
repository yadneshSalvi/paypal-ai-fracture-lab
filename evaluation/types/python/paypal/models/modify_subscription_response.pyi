from __future__ import annotations
from typing_extensions import NotRequired, TypedDict
from ..core import UNSET, Optional, SdkBaseModel
from .link_description import LinkDescription, LinkDescriptionDict
from .money import Money, MoneyDict
from .plan_override import PlanOverride, PlanOverrideDict
from .shipping_details import ShippingDetails, ShippingDetailsDict

class ModifySubscriptionResponse(SdkBaseModel):
    plan_id: Optional[str] = UNSET
    quantity: Optional[str] = UNSET
    shipping_amount: Optional[Money] = UNSET
    shipping_address: Optional[ShippingDetails] = UNSET
    plan: Optional[PlanOverride] = UNSET
    plan_overridden: Optional[bool] = UNSET
    links: Optional[list[LinkDescription]] = UNSET

class ModifySubscriptionResponseDict(TypedDict):
    plan_id: NotRequired[str]
    quantity: NotRequired[str]
    shipping_amount: NotRequired[MoneyDict]
    shipping_address: NotRequired[ShippingDetailsDict]
    plan: NotRequired[PlanOverrideDict]
    plan_overridden: NotRequired[bool]
    links: NotRequired[list[LinkDescriptionDict]]
