from __future__ import annotations
from typing_extensions import NotRequired, TypedDict
from ..core import UNSET, Optional, SdkBaseModel
from .customer import Customer, CustomerDict
from .setup_token_request_payment_source import SetupTokenRequestPaymentSource, SetupTokenRequestPaymentSourceDict

class SetupTokenRequest(SdkBaseModel):
    customer: Optional[Customer] = UNSET
    payment_source: SetupTokenRequestPaymentSource

class SetupTokenRequestDict(TypedDict):
    customer: NotRequired[CustomerDict]
    payment_source: SetupTokenRequestPaymentSourceDict
