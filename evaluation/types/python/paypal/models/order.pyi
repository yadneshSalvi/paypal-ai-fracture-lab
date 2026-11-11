from __future__ import annotations
from typing_extensions import NotRequired, TypedDict
from ..core import UNSET, Optional, SdkBaseModel
from .enums.checkout_payment_intent import CheckoutPaymentIntentOrStr
from .enums.order_status import OrderStatusOrStr
from .enums.processing_instruction import ProcessingInstructionOrStr
from .link_description import LinkDescription, LinkDescriptionDict
from .payer import Payer, PayerDict
from .payment_source_response import PaymentSourceResponse, PaymentSourceResponseDict
from .purchase_unit import PurchaseUnit, PurchaseUnitDict

class Order(SdkBaseModel):
    create_time: Optional[str] = UNSET
    update_time: Optional[str] = UNSET
    id: Optional[str] = UNSET
    payment_source: Optional[PaymentSourceResponse] = UNSET
    intent: Optional[CheckoutPaymentIntentOrStr] = UNSET
    processing_instruction: Optional[ProcessingInstructionOrStr] = UNSET
    payer: Optional[Payer] = UNSET
    purchase_units: Optional[list[PurchaseUnit]] = UNSET
    status: Optional[OrderStatusOrStr] = UNSET
    links: Optional[list[LinkDescription]] = UNSET

class OrderDict(TypedDict):
    create_time: NotRequired[str]
    update_time: NotRequired[str]
    id: NotRequired[str]
    payment_source: NotRequired[PaymentSourceResponseDict]
    intent: NotRequired[CheckoutPaymentIntentOrStr]
    processing_instruction: NotRequired[ProcessingInstructionOrStr]
    payer: NotRequired[PayerDict]
    purchase_units: NotRequired[list[PurchaseUnitDict]]
    status: NotRequired[OrderStatusOrStr]
    links: NotRequired[list[LinkDescriptionDict]]
