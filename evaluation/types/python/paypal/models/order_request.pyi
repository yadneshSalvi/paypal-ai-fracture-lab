from __future__ import annotations
from typing_extensions import NotRequired, TypedDict
from ..core import UNSET, Optional, SdkBaseModel
from .enums.checkout_payment_intent import CheckoutPaymentIntentOrStr
from .enums.processing_instruction import ProcessingInstructionOrStr
from .order_application_context import OrderApplicationContext, OrderApplicationContextDict
from .payer import Payer, PayerDict
from .payment_source import PaymentSource, PaymentSourceDict
from .purchase_unit_request import PurchaseUnitRequest, PurchaseUnitRequestDict

class OrderRequest(SdkBaseModel):
    intent: CheckoutPaymentIntentOrStr
    processing_instruction: Optional[ProcessingInstructionOrStr] = UNSET
    payer: Optional[Payer] = UNSET
    purchase_units: list[PurchaseUnitRequest]
    payment_source: Optional[PaymentSource] = UNSET
    application_context: Optional[OrderApplicationContext] = UNSET

class OrderRequestDict(TypedDict):
    intent: CheckoutPaymentIntentOrStr
    processing_instruction: NotRequired[ProcessingInstructionOrStr]
    payer: NotRequired[PayerDict]
    purchase_units: list[PurchaseUnitRequestDict]
    payment_source: NotRequired[PaymentSourceDict]
    application_context: NotRequired[OrderApplicationContextDict]
