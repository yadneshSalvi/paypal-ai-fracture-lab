from __future__ import annotations
from typing_extensions import NotRequired, TypedDict
from ..core import UNSET, Optional, SdkBaseModel
from .enums.processing_instruction import ProcessingInstructionOrStr
from .order_confirm_application_context import OrderConfirmApplicationContext, OrderConfirmApplicationContextDict
from .payment_source import PaymentSource, PaymentSourceDict

class ConfirmOrderRequest(SdkBaseModel):
    payment_source: PaymentSource
    processing_instruction: Optional[ProcessingInstructionOrStr] = UNSET
    application_context: Optional[OrderConfirmApplicationContext] = UNSET

class ConfirmOrderRequestDict(TypedDict):
    payment_source: PaymentSourceDict
    processing_instruction: NotRequired[ProcessingInstructionOrStr]
    application_context: NotRequired[OrderConfirmApplicationContextDict]
