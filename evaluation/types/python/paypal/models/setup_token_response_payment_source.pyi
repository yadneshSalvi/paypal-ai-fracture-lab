from __future__ import annotations
from typing_extensions import NotRequired, TypedDict
from ..core import UNSET, Optional, SdkBaseModel
from .pay_pal_payment_token import PayPalPaymentToken, PayPalPaymentTokenDict
from .setup_token_response_card import SetupTokenResponseCard, SetupTokenResponseCardDict
from .venmo_payment_token import VenmoPaymentToken, VenmoPaymentTokenDict

class SetupTokenResponsePaymentSource(SdkBaseModel):
    card: Optional[SetupTokenResponseCard] = UNSET
    paypal: Optional[PayPalPaymentToken] = UNSET
    venmo: Optional[VenmoPaymentToken] = UNSET

class SetupTokenResponsePaymentSourceDict(TypedDict):
    card: NotRequired[SetupTokenResponseCardDict]
    paypal: NotRequired[PayPalPaymentTokenDict]
    venmo: NotRequired[VenmoPaymentTokenDict]
