from __future__ import annotations
from typing_extensions import NotRequired, TypedDict
from ..core import UNSET, Optional, SdkBaseModel
from .capture_status_details import CaptureStatusDetails, CaptureStatusDetailsDict
from .enums.capture_status import CaptureStatusOrStr
from .enums.disbursement_mode import DisbursementMode, DisbursementModeOrStr
from .link_description import LinkDescription, LinkDescriptionDict
from .money import Money, MoneyDict
from .network_transaction import NetworkTransaction, NetworkTransactionDict
from .payee_base import PayeeBase, PayeeBaseDict
from .payment_supplementary_data import PaymentSupplementaryData, PaymentSupplementaryDataDict
from .processor_response import ProcessorResponse, ProcessorResponseDict
from .seller_protection import SellerProtection, SellerProtectionDict
from .seller_receivable_breakdown import SellerReceivableBreakdown, SellerReceivableBreakdownDict

class CapturedPayment(SdkBaseModel):
    status: Optional[CaptureStatusOrStr] = UNSET
    status_details: Optional[CaptureStatusDetails] = UNSET
    id: Optional[str] = UNSET
    amount: Optional[Money] = UNSET
    invoice_id: Optional[str] = UNSET
    custom_id: Optional[str] = UNSET
    network_transaction_reference: Optional[NetworkTransaction] = UNSET
    seller_protection: Optional[SellerProtection] = UNSET
    final_capture: bool = False
    seller_receivable_breakdown: Optional[SellerReceivableBreakdown] = UNSET
    disbursement_mode: DisbursementModeOrStr = DisbursementMode.INSTANT
    links: Optional[list[LinkDescription]] = UNSET
    processor_response: Optional[ProcessorResponse] = UNSET
    create_time: Optional[str] = UNSET
    update_time: Optional[str] = UNSET
    supplementary_data: Optional[PaymentSupplementaryData] = UNSET
    payee: Optional[PayeeBase] = UNSET

class CapturedPaymentDict(TypedDict):
    status: NotRequired[CaptureStatusOrStr]
    status_details: NotRequired[CaptureStatusDetailsDict]
    id: NotRequired[str]
    amount: NotRequired[MoneyDict]
    invoice_id: NotRequired[str]
    custom_id: NotRequired[str]
    network_transaction_reference: NotRequired[NetworkTransactionDict]
    seller_protection: NotRequired[SellerProtectionDict]
    final_capture: NotRequired[bool]
    seller_receivable_breakdown: NotRequired[SellerReceivableBreakdownDict]
    disbursement_mode: NotRequired[DisbursementModeOrStr]
    links: NotRequired[list[LinkDescriptionDict]]
    processor_response: NotRequired[ProcessorResponseDict]
    create_time: NotRequired[str]
    update_time: NotRequired[str]
    supplementary_data: NotRequired[PaymentSupplementaryDataDict]
    payee: NotRequired[PayeeBaseDict]
