from __future__ import annotations
from typing_extensions import NotRequired, TypedDict
from ..core import UNSET, Optional, SdkBaseModel
from .amount_with_breakdown import AmountWithBreakdown, AmountWithBreakdownDict
from .item_request import ItemRequest, ItemRequestDict
from .payee_base import PayeeBase, PayeeBaseDict
from .payment_instruction import PaymentInstruction, PaymentInstructionDict
from .shipping_details import ShippingDetails, ShippingDetailsDict
from .supplementary_data import SupplementaryData, SupplementaryDataDict

class PurchaseUnitRequest(SdkBaseModel):
    reference_id: Optional[str] = UNSET
    amount: AmountWithBreakdown
    payee: Optional[PayeeBase] = UNSET
    payment_instruction: Optional[PaymentInstruction] = UNSET
    description: Optional[str] = UNSET
    custom_id: Optional[str] = UNSET
    invoice_id: Optional[str] = UNSET
    soft_descriptor: Optional[str] = UNSET
    items: Optional[list[ItemRequest]] = UNSET
    shipping: Optional[ShippingDetails] = UNSET
    supplementary_data: Optional[SupplementaryData] = UNSET

class PurchaseUnitRequestDict(TypedDict):
    reference_id: NotRequired[str]
    amount: AmountWithBreakdownDict
    payee: NotRequired[PayeeBaseDict]
    payment_instruction: NotRequired[PaymentInstructionDict]
    description: NotRequired[str]
    custom_id: NotRequired[str]
    invoice_id: NotRequired[str]
    soft_descriptor: NotRequired[str]
    items: NotRequired[list[ItemRequestDict]]
    shipping: NotRequired[ShippingDetailsDict]
    supplementary_data: NotRequired[SupplementaryDataDict]
