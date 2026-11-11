from __future__ import annotations
from typing_extensions import NotRequired, TypedDict
from ..core import UNSET, Optional, SdkBaseModel
from .money import Money, MoneyDict
from .order_billing_plan import OrderBillingPlan, OrderBillingPlanDict
from .universal_product_code import UniversalProductCode, UniversalProductCodeDict

class LineItem(SdkBaseModel):
    name: str
    quantity: str
    description: Optional[str] = UNSET
    sku: Optional[str] = UNSET
    url: Optional[str] = UNSET
    image_url: Optional[str] = UNSET
    upc: Optional[UniversalProductCode] = UNSET
    billing_plan: Optional[OrderBillingPlan] = UNSET
    unit_amount: Optional[Money] = UNSET
    tax: Optional[Money] = UNSET
    commodity_code: Optional[str] = UNSET
    discount_amount: Optional[Money] = UNSET
    total_amount: Optional[Money] = UNSET
    unit_of_measure: Optional[str] = UNSET

class LineItemDict(TypedDict):
    name: str
    quantity: str
    description: NotRequired[str]
    sku: NotRequired[str]
    url: NotRequired[str]
    image_url: NotRequired[str]
    upc: NotRequired[UniversalProductCodeDict]
    billing_plan: NotRequired[OrderBillingPlanDict]
    unit_amount: NotRequired[MoneyDict]
    tax: NotRequired[MoneyDict]
    commodity_code: NotRequired[str]
    discount_amount: NotRequired[MoneyDict]
    total_amount: NotRequired[MoneyDict]
    unit_of_measure: NotRequired[str]
