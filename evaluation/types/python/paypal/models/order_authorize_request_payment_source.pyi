from __future__ import annotations
from typing_extensions import NotRequired, TypedDict
from ..core import UNSET, Optional, SdkBaseModel
from .apple_pay_request import ApplePayRequest, ApplePayRequestDict
from .card_request import CardRequest, CardRequestDict
from .google_pay_request import GooglePayRequest, GooglePayRequestDict
from .pay_pal_wallet import PayPalWallet, PayPalWalletDict
from .token import Token, TokenDict
from .venmo_wallet_request import VenmoWalletRequest, VenmoWalletRequestDict

class OrderAuthorizeRequestPaymentSource(SdkBaseModel):
    card: Optional[CardRequest] = UNSET
    token: Optional[Token] = UNSET
    paypal: Optional[PayPalWallet] = UNSET
    apple_pay: Optional[ApplePayRequest] = UNSET
    google_pay: Optional[GooglePayRequest] = UNSET
    venmo: Optional[VenmoWalletRequest] = UNSET

class OrderAuthorizeRequestPaymentSourceDict(TypedDict):
    card: NotRequired[CardRequestDict]
    token: NotRequired[TokenDict]
    paypal: NotRequired[PayPalWalletDict]
    apple_pay: NotRequired[ApplePayRequestDict]
    google_pay: NotRequired[GooglePayRequestDict]
    venmo: NotRequired[VenmoWalletRequestDict]
