from __future__ import annotations
from typing_extensions import NotRequired, TypedDict
from ..core import UNSET, Optional, SdkBaseModel
from .checkout_option import CheckoutOption, CheckoutOptionDict
from .money import Money, MoneyDict
from .tax_amount import TaxAmount, TaxAmountDict

class ItemDetails(SdkBaseModel):
    item_code: Optional[str] = UNSET
    item_name: Optional[str] = UNSET
    item_description: Optional[str] = UNSET
    item_options: Optional[str] = UNSET
    item_quantity: Optional[str] = UNSET
    item_unit_price: Optional[Money] = UNSET
    item_amount: Optional[Money] = UNSET
    discount_amount: Optional[Money] = UNSET
    adjustment_amount: Optional[Money] = UNSET
    gift_wrap_amount: Optional[Money] = UNSET
    tax_percentage: Optional[str] = UNSET
    tax_amounts: Optional[list[TaxAmount]] = UNSET
    basic_shipping_amount: Optional[Money] = UNSET
    extra_shipping_amount: Optional[Money] = UNSET
    handling_amount: Optional[Money] = UNSET
    insurance_amount: Optional[Money] = UNSET
    total_item_amount: Optional[Money] = UNSET
    invoice_number: Optional[str] = UNSET
    checkout_options: Optional[list[CheckoutOption]] = UNSET

class ItemDetailsDict(TypedDict):
    item_code: NotRequired[str]
    item_name: NotRequired[str]
    item_description: NotRequired[str]
    item_options: NotRequired[str]
    item_quantity: NotRequired[str]
    item_unit_price: NotRequired[MoneyDict]
    item_amount: NotRequired[MoneyDict]
    discount_amount: NotRequired[MoneyDict]
    adjustment_amount: NotRequired[MoneyDict]
    gift_wrap_amount: NotRequired[MoneyDict]
    tax_percentage: NotRequired[str]
    tax_amounts: NotRequired[list[TaxAmountDict]]
    basic_shipping_amount: NotRequired[MoneyDict]
    extra_shipping_amount: NotRequired[MoneyDict]
    handling_amount: NotRequired[MoneyDict]
    insurance_amount: NotRequired[MoneyDict]
    total_item_amount: NotRequired[MoneyDict]
    invoice_number: NotRequired[str]
    checkout_options: NotRequired[list[CheckoutOptionDict]]
