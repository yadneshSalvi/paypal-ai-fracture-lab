from __future__ import annotations
from typing_extensions import NotRequired, TypedDict
from ..core import UNSET, Optional, SdkBaseModel
from .enums.checkout_payment_intent import CheckoutPaymentIntentOrStr
from .enums.order_status import OrderStatusOrStr
from .enums.processing_instruction import ProcessingInstructionOrStr
from .link_description import LinkDescription, LinkDescriptionDict
from .order_authorize_response_payment_source import OrderAuthorizeResponsePaymentSource, OrderAuthorizeResponsePaymentSourceDict
from .payer import Payer, PayerDict
from .purchase_unit import PurchaseUnit, PurchaseUnitDict

class OrderAuthorizeResponse(SdkBaseModel):
    create_time: Optional[str] = UNSET
    update_time: Optional[str] = UNSET
    id: Optional[str] = UNSET
    payment_source: Optional[OrderAuthorizeResponsePaymentSource] = UNSET
    intent: Optional[CheckoutPaymentIntentOrStr] = UNSET
    processing_instruction: Optional[ProcessingInstructionOrStr] = UNSET
    payer: Optional[Payer] = UNSET
    purchase_units: Optional[list[PurchaseUnit]] = UNSET
    status: Optional[OrderStatusOrStr] = UNSET
    links: Optional[list[LinkDescription]] = UNSET

class OrderAuthorizeResponseDict(TypedDict):
    create_time: NotRequired[str]
    update_time: NotRequired[str]
    id: NotRequired[str]
    payment_source: NotRequired[OrderAuthorizeResponsePaymentSourceDict]
    intent: NotRequired[CheckoutPaymentIntentOrStr]
    processing_instruction: NotRequired[ProcessingInstructionOrStr]
    payer: NotRequired[PayerDict]
    purchase_units: NotRequired[list[PurchaseUnitDict]]
    status: NotRequired[OrderStatusOrStr]
    links: NotRequired[list[LinkDescriptionDict]]
