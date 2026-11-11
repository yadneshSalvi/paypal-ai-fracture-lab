from __future__ import annotations
from typing import Any
from typing_extensions import NotRequired, TypedDict
from ..core import UNSET, Optional, SdkBaseModel
from .amount_with_breakdown import AmountWithBreakdown, AmountWithBreakdownDict
from .item import Item, ItemDict
from .payee_base import PayeeBase, PayeeBaseDict
from .payment_collection import PaymentCollection, PaymentCollectionDict
from .payment_instruction import PaymentInstruction, PaymentInstructionDict
from .shipping_with_tracking_details import ShippingWithTrackingDetails, ShippingWithTrackingDetailsDict
from .supplementary_data import SupplementaryData, SupplementaryDataDict

class PurchaseUnit(SdkBaseModel):
    reference_id: Optional[str] = UNSET
    amount: Optional[AmountWithBreakdown] = UNSET
    payee: Optional[PayeeBase] = UNSET
    payment_instruction: Optional[PaymentInstruction] = UNSET
    description: Optional[str] = UNSET
    custom_id: Optional[str] = UNSET
    invoice_id: Optional[str] = UNSET
    id: Optional[str] = UNSET
    soft_descriptor: Optional[str] = UNSET
    items: Optional[list[Item]] = UNSET
    shipping: Optional[ShippingWithTrackingDetails] = UNSET
    supplementary_data: Optional[SupplementaryData] = UNSET
    payments: Optional[PaymentCollection] = UNSET
    most_recent_errors: Optional[list[Any]] = UNSET

class PurchaseUnitDict(TypedDict):
    reference_id: NotRequired[str]
    amount: NotRequired[AmountWithBreakdownDict]
    payee: NotRequired[PayeeBaseDict]
    payment_instruction: NotRequired[PaymentInstructionDict]
    description: NotRequired[str]
    custom_id: NotRequired[str]
    invoice_id: NotRequired[str]
    id: NotRequired[str]
    soft_descriptor: NotRequired[str]
    items: NotRequired[list[ItemDict]]
    shipping: NotRequired[ShippingWithTrackingDetailsDict]
    supplementary_data: NotRequired[SupplementaryDataDict]
    payments: NotRequired[PaymentCollectionDict]
    most_recent_errors: NotRequired[list[Any]]
