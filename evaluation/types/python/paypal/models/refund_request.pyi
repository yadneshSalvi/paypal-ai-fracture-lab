from __future__ import annotations
from typing_extensions import NotRequired, TypedDict
from ..core import UNSET, Optional, SdkBaseModel
from .money import Money, MoneyDict
from .refund_payment_instruction import RefundPaymentInstruction, RefundPaymentInstructionDict

class RefundRequest(SdkBaseModel):
    amount: Optional[Money] = UNSET
    custom_id: Optional[str] = UNSET
    invoice_id: Optional[str] = UNSET
    note_to_payer: Optional[str] = UNSET
    payment_instruction: Optional[RefundPaymentInstruction] = UNSET

class RefundRequestDict(TypedDict):
    amount: NotRequired[MoneyDict]
    custom_id: NotRequired[str]
    invoice_id: NotRequired[str]
    note_to_payer: NotRequired[str]
    payment_instruction: NotRequired[RefundPaymentInstructionDict]
