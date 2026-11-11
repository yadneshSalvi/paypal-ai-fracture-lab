from __future__ import annotations
from typing_extensions import NotRequired, TypedDict
from ..core import UNSET, Optional, SdkBaseModel
from .capture_payment_instruction import CapturePaymentInstruction, CapturePaymentInstructionDict
from .money import Money, MoneyDict

class CaptureRequest(SdkBaseModel):
    amount: Optional[Money] = UNSET
    invoice_id: Optional[str] = UNSET
    final_capture: bool = False
    payment_instruction: Optional[CapturePaymentInstruction] = UNSET
    note_to_payer: Optional[str] = UNSET
    soft_descriptor: Optional[str] = UNSET

class CaptureRequestDict(TypedDict):
    amount: NotRequired[MoneyDict]
    invoice_id: NotRequired[str]
    final_capture: NotRequired[bool]
    payment_instruction: NotRequired[CapturePaymentInstructionDict]
    note_to_payer: NotRequired[str]
    soft_descriptor: NotRequired[str]
