from __future__ import annotations
from typing_extensions import NotRequired, TypedDict
from ..core import UNSET, Optional, SdkBaseModel
from .customer import Customer, CustomerDict
from .enums.payment_token_status import PaymentTokenStatus, PaymentTokenStatusOrStr
from .link_description import LinkDescription, LinkDescriptionDict
from .setup_token_response_payment_source import SetupTokenResponsePaymentSource, SetupTokenResponsePaymentSourceDict

class SetupTokenResponse(SdkBaseModel):
    id: Optional[str] = UNSET
    customer: Optional[Customer] = UNSET
    status: PaymentTokenStatusOrStr = PaymentTokenStatus.CREATED
    payment_source: Optional[SetupTokenResponsePaymentSource] = UNSET
    links: Optional[list[LinkDescription]] = UNSET

class SetupTokenResponseDict(TypedDict):
    id: NotRequired[str]
    customer: NotRequired[CustomerDict]
    status: NotRequired[PaymentTokenStatusOrStr]
    payment_source: NotRequired[SetupTokenResponsePaymentSourceDict]
    links: NotRequired[list[LinkDescriptionDict]]
