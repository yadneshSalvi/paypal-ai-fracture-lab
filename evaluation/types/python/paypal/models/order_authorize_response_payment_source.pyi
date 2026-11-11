from __future__ import annotations
from typing_extensions import NotRequired, TypedDict
from ..core import UNSET, Optional, SdkBaseModel
from .apple_pay_payment_object import ApplePayPaymentObject, ApplePayPaymentObjectDict
from .card_response import CardResponse, CardResponseDict
from .google_pay_wallet_response import GooglePayWalletResponse, GooglePayWalletResponseDict
from .pay_pal_wallet_response import PayPalWalletResponse, PayPalWalletResponseDict
from .venmo_wallet_response import VenmoWalletResponse, VenmoWalletResponseDict

class OrderAuthorizeResponsePaymentSource(SdkBaseModel):
    card: Optional[CardResponse] = UNSET
    paypal: Optional[PayPalWalletResponse] = UNSET
    apple_pay: Optional[ApplePayPaymentObject] = UNSET
    google_pay: Optional[GooglePayWalletResponse] = UNSET
    venmo: Optional[VenmoWalletResponse] = UNSET

class OrderAuthorizeResponsePaymentSourceDict(TypedDict):
    card: NotRequired[CardResponseDict]
    paypal: NotRequired[PayPalWalletResponseDict]
    apple_pay: NotRequired[ApplePayPaymentObjectDict]
    google_pay: NotRequired[GooglePayWalletResponseDict]
    venmo: NotRequired[VenmoWalletResponseDict]
