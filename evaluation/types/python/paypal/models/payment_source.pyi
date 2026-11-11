from __future__ import annotations
from typing_extensions import NotRequired, TypedDict
from ..core import UNSET, Optional, SdkBaseModel
from .apple_pay_request import ApplePayRequest, ApplePayRequestDict
from .bancontact_payment_request import BancontactPaymentRequest, BancontactPaymentRequestDict
from .blik_payment_request import BlikPaymentRequest, BlikPaymentRequestDict
from .card_request import CardRequest, CardRequestDict
from .eps_payment_request import EpsPaymentRequest, EpsPaymentRequestDict
from .giropay_payment_request import GiropayPaymentRequest, GiropayPaymentRequestDict
from .google_pay_request import GooglePayRequest, GooglePayRequestDict
from .i_deal_payment_request import IDealPaymentRequest, IDealPaymentRequestDict
from .my_bank_payment_request import MyBankPaymentRequest, MyBankPaymentRequestDict
from .p24_payment_request import P24PaymentRequest, P24PaymentRequestDict
from .pay_pal_wallet import PayPalWallet, PayPalWalletDict
from .sofort_payment_request import SofortPaymentRequest, SofortPaymentRequestDict
from .token import Token, TokenDict
from .trustly_payment_request import TrustlyPaymentRequest, TrustlyPaymentRequestDict
from .venmo_wallet_request import VenmoWalletRequest, VenmoWalletRequestDict

class PaymentSource(SdkBaseModel):
    card: Optional[CardRequest] = UNSET
    token: Optional[Token] = UNSET
    paypal: Optional[PayPalWallet] = UNSET
    bancontact: Optional[BancontactPaymentRequest] = UNSET
    blik: Optional[BlikPaymentRequest] = UNSET
    eps: Optional[EpsPaymentRequest] = UNSET
    giropay: Optional[GiropayPaymentRequest] = UNSET
    ideal: Optional[IDealPaymentRequest] = UNSET
    mybank: Optional[MyBankPaymentRequest] = UNSET
    p24: Optional[P24PaymentRequest] = UNSET
    sofort: Optional[SofortPaymentRequest] = UNSET
    trustly: Optional[TrustlyPaymentRequest] = UNSET
    apple_pay: Optional[ApplePayRequest] = UNSET
    google_pay: Optional[GooglePayRequest] = UNSET
    venmo: Optional[VenmoWalletRequest] = UNSET

class PaymentSourceDict(TypedDict):
    card: NotRequired[CardRequestDict]
    token: NotRequired[TokenDict]
    paypal: NotRequired[PayPalWalletDict]
    bancontact: NotRequired[BancontactPaymentRequestDict]
    blik: NotRequired[BlikPaymentRequestDict]
    eps: NotRequired[EpsPaymentRequestDict]
    giropay: NotRequired[GiropayPaymentRequestDict]
    ideal: NotRequired[IDealPaymentRequestDict]
    mybank: NotRequired[MyBankPaymentRequestDict]
    p24: NotRequired[P24PaymentRequestDict]
    sofort: NotRequired[SofortPaymentRequestDict]
    trustly: NotRequired[TrustlyPaymentRequestDict]
    apple_pay: NotRequired[ApplePayRequestDict]
    google_pay: NotRequired[GooglePayRequestDict]
    venmo: NotRequired[VenmoWalletRequestDict]
