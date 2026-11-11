from __future__ import annotations
from typing_extensions import NotRequired, TypedDict
from ..core import UNSET, Optional, SdkBaseModel
from .customer import Customer, CustomerDict
from .payment_token_request_payment_source import PaymentTokenRequestPaymentSource, PaymentTokenRequestPaymentSourceDict

class PaymentTokenRequest(SdkBaseModel):
    customer: Optional[Customer] = UNSET
    payment_source: PaymentTokenRequestPaymentSource

class PaymentTokenRequestDict(TypedDict):
    customer: NotRequired[CustomerDict]
    payment_source: PaymentTokenRequestPaymentSourceDict
