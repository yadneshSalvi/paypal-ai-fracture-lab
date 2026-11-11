from __future__ import annotations
from typing_extensions import NotRequired, TypedDict
from ..core import UNSET, Optional, SdkBaseModel
from .apple_pay_payment_object import ApplePayPaymentObject, ApplePayPaymentObjectDict
from .bancontact_payment_object import BancontactPaymentObject, BancontactPaymentObjectDict
from .blik_payment_object import BlikPaymentObject, BlikPaymentObjectDict
from .card_response import CardResponse, CardResponseDict
from .eps_payment_object import EpsPaymentObject, EpsPaymentObjectDict
from .giropay_payment_object import GiropayPaymentObject, GiropayPaymentObjectDict
from .google_pay_wallet_response import GooglePayWalletResponse, GooglePayWalletResponseDict
from .i_deal_payment_object import IDealPaymentObject, IDealPaymentObjectDict
from .my_bank_payment_object import MyBankPaymentObject, MyBankPaymentObjectDict
from .p24_payment_object import P24PaymentObject, P24PaymentObjectDict
from .pay_pal_wallet_response import PayPalWalletResponse, PayPalWalletResponseDict
from .sofort_payment_object import SofortPaymentObject, SofortPaymentObjectDict
from .trustly_payment_object import TrustlyPaymentObject, TrustlyPaymentObjectDict
from .venmo_wallet_response import VenmoWalletResponse, VenmoWalletResponseDict

class PaymentSourceResponse(SdkBaseModel):
    card: Optional[CardResponse] = UNSET
    paypal: Optional[PayPalWalletResponse] = UNSET
    bancontact: Optional[BancontactPaymentObject] = UNSET
    blik: Optional[BlikPaymentObject] = UNSET
    eps: Optional[EpsPaymentObject] = UNSET
    giropay: Optional[GiropayPaymentObject] = UNSET
    ideal: Optional[IDealPaymentObject] = UNSET
    mybank: Optional[MyBankPaymentObject] = UNSET
    p24: Optional[P24PaymentObject] = UNSET
    sofort: Optional[SofortPaymentObject] = UNSET
    trustly: Optional[TrustlyPaymentObject] = UNSET
    apple_pay: Optional[ApplePayPaymentObject] = UNSET
    google_pay: Optional[GooglePayWalletResponse] = UNSET
    venmo: Optional[VenmoWalletResponse] = UNSET

class PaymentSourceResponseDict(TypedDict):
    card: NotRequired[CardResponseDict]
    paypal: NotRequired[PayPalWalletResponseDict]
    bancontact: NotRequired[BancontactPaymentObjectDict]
    blik: NotRequired[BlikPaymentObjectDict]
    eps: NotRequired[EpsPaymentObjectDict]
    giropay: NotRequired[GiropayPaymentObjectDict]
    ideal: NotRequired[IDealPaymentObjectDict]
    mybank: NotRequired[MyBankPaymentObjectDict]
    p24: NotRequired[P24PaymentObjectDict]
    sofort: NotRequired[SofortPaymentObjectDict]
    trustly: NotRequired[TrustlyPaymentObjectDict]
    apple_pay: NotRequired[ApplePayPaymentObjectDict]
    google_pay: NotRequired[GooglePayWalletResponseDict]
    venmo: NotRequired[VenmoWalletResponseDict]
