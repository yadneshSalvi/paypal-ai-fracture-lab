from __future__ import annotations
from typing_extensions import NotRequired, TypedDict
from ..core import UNSET, Optional, SdkBaseModel
from .enums.item_category import ItemCategoryOrStr
from .money import Money, MoneyDict
from .order_billing_plan import OrderBillingPlan, OrderBillingPlanDict
from .universal_product_code import UniversalProductCode, UniversalProductCodeDict

class ItemRequest(SdkBaseModel):
    name: str
    unit_amount: Money
    tax: Optional[Money] = UNSET
    quantity: str
    description: Optional[str] = UNSET
    sku: Optional[str] = UNSET
    url: Optional[str] = UNSET
    category: Optional[ItemCategoryOrStr] = UNSET
    image_url: Optional[str] = UNSET
    upc: Optional[UniversalProductCode] = UNSET
    billing_plan: Optional[OrderBillingPlan] = UNSET

class ItemRequestDict(TypedDict):
    name: str
    unit_amount: MoneyDict
    tax: NotRequired[MoneyDict]
    quantity: str
    description: NotRequired[str]
    sku: NotRequired[str]
    url: NotRequired[str]
    category: NotRequired[ItemCategoryOrStr]
    image_url: NotRequired[str]
    upc: NotRequired[UniversalProductCodeDict]
    billing_plan: NotRequired[OrderBillingPlanDict]
