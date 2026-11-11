from __future__ import annotations
from typing_extensions import NotRequired, TypedDict
from ..core import UNSET, Optional, SdkBaseModel
from .apple_pay_payment_token import ApplePayPaymentToken, ApplePayPaymentTokenDict
from .card_payment_token_entity import CardPaymentTokenEntity, CardPaymentTokenEntityDict
from .pay_pal_payment_token import PayPalPaymentToken, PayPalPaymentTokenDict
from .venmo_payment_token import VenmoPaymentToken, VenmoPaymentTokenDict

class PaymentTokenResponsePaymentSource(SdkBaseModel):
    card: Optional[CardPaymentTokenEntity] = UNSET
    paypal: Optional[PayPalPaymentToken] = UNSET
    venmo: Optional[VenmoPaymentToken] = UNSET
    apple_pay: Optional[ApplePayPaymentToken] = UNSET

class PaymentTokenResponsePaymentSourceDict(TypedDict):
    card: NotRequired[CardPaymentTokenEntityDict]
    paypal: NotRequired[PayPalPaymentTokenDict]
    venmo: NotRequired[VenmoPaymentTokenDict]
    apple_pay: NotRequired[ApplePayPaymentTokenDict]
