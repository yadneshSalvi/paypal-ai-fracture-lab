from __future__ import annotations
from typing_extensions import NotRequired, TypedDict
from ..core import UNSET, Optional, SdkBaseModel
from .billing_plan import BillingPlan, BillingPlanDict
from .link_description import LinkDescription, LinkDescriptionDict

class PlanCollection(SdkBaseModel):
    plans: Optional[list[BillingPlan]] = UNSET
    total_items: Optional[int] = UNSET
    total_pages: Optional[int] = UNSET
    links: Optional[list[LinkDescription]] = UNSET

class PlanCollectionDict(TypedDict):
    plans: NotRequired[list[BillingPlanDict]]
    total_items: NotRequired[int]
    total_pages: NotRequired[int]
    links: NotRequired[list[LinkDescriptionDict]]
