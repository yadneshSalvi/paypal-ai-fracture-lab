from __future__ import annotations
from typing_extensions import NotRequired, TypedDict
from ..core import UNSET, Optional, SdkBaseModel
from .money import Money, MoneyDict
from .plan_override import PlanOverride, PlanOverrideDict
from .shipping_details import ShippingDetails, ShippingDetailsDict
from .subscription_patch_application_context import SubscriptionPatchApplicationContext, SubscriptionPatchApplicationContextDict

class ModifySubscriptionRequest(SdkBaseModel):
    plan_id: Optional[str] = UNSET
    quantity: Optional[str] = UNSET
    shipping_amount: Optional[Money] = UNSET
    shipping_address: Optional[ShippingDetails] = UNSET
    application_context: Optional[SubscriptionPatchApplicationContext] = UNSET
    plan: Optional[PlanOverride] = UNSET

class ModifySubscriptionRequestDict(TypedDict):
    plan_id: NotRequired[str]
    quantity: NotRequired[str]
    shipping_amount: NotRequired[MoneyDict]
    shipping_address: NotRequired[ShippingDetailsDict]
    application_context: NotRequired[SubscriptionPatchApplicationContextDict]
    plan: NotRequired[PlanOverrideDict]
