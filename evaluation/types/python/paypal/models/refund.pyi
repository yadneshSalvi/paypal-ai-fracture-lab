from __future__ import annotations
from typing_extensions import NotRequired, TypedDict
from ..core import UNSET, Optional, SdkBaseModel
from .enums.refund_status import RefundStatusOrStr
from .link_description import LinkDescription, LinkDescriptionDict
from .money import Money, MoneyDict
from .payee_base import PayeeBase, PayeeBaseDict
from .refund_status_details import RefundStatusDetails, RefundStatusDetailsDict
from .seller_payable_breakdown import SellerPayableBreakdown, SellerPayableBreakdownDict

class Refund(SdkBaseModel):
    status: Optional[RefundStatusOrStr] = UNSET
    status_details: Optional[RefundStatusDetails] = UNSET
    id: Optional[str] = UNSET
    amount: Optional[Money] = UNSET
    invoice_id: Optional[str] = UNSET
    custom_id: Optional[str] = UNSET
    acquirer_reference_number: Optional[str] = UNSET
    note_to_payer: Optional[str] = UNSET
    seller_payable_breakdown: Optional[SellerPayableBreakdown] = UNSET
    payer: Optional[PayeeBase] = UNSET
    links: Optional[list[LinkDescription]] = UNSET
    create_time: Optional[str] = UNSET
    update_time: Optional[str] = UNSET

class RefundDict(TypedDict):
    status: NotRequired[RefundStatusOrStr]
    status_details: NotRequired[RefundStatusDetailsDict]
    id: NotRequired[str]
    amount: NotRequired[MoneyDict]
    invoice_id: NotRequired[str]
    custom_id: NotRequired[str]
    acquirer_reference_number: NotRequired[str]
    note_to_payer: NotRequired[str]
    seller_payable_breakdown: NotRequired[SellerPayableBreakdownDict]
    payer: NotRequired[PayeeBaseDict]
    links: NotRequired[list[LinkDescriptionDict]]
    create_time: NotRequired[str]
    update_time: NotRequired[str]
