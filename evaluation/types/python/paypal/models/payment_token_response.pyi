from __future__ import annotations
from typing_extensions import NotRequired, TypedDict
from ..core import UNSET, Optional, SdkBaseModel
from .customer_response import CustomerResponse, CustomerResponseDict
from .link_description import LinkDescription, LinkDescriptionDict
from .payment_token_response_payment_source import PaymentTokenResponsePaymentSource, PaymentTokenResponsePaymentSourceDict

class PaymentTokenResponse(SdkBaseModel):
    id: Optional[str] = UNSET
    customer: Optional[CustomerResponse] = UNSET
    payment_source: Optional[PaymentTokenResponsePaymentSource] = UNSET
    links: Optional[list[LinkDescription]] = UNSET

class PaymentTokenResponseDict(TypedDict):
    id: NotRequired[str]
    customer: NotRequired[CustomerResponseDict]
    payment_source: NotRequired[PaymentTokenResponsePaymentSourceDict]
    links: NotRequired[list[LinkDescriptionDict]]
