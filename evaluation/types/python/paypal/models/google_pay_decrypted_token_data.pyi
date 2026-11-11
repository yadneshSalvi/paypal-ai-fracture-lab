from __future__ import annotations
from typing_extensions import NotRequired, TypedDict
from ..core import UNSET, Optional, SdkBaseModel
from .enums.google_pay_authentication_method import GooglePayAuthenticationMethodOrStr
from .enums.google_pay_payment_method import GooglePayPaymentMethodOrStr
from .google_pay_card import GooglePayCard, GooglePayCardDict

class GooglePayDecryptedTokenData(SdkBaseModel):
    message_id: Optional[str] = UNSET
    message_expiration: Optional[str] = UNSET
    payment_method: GooglePayPaymentMethodOrStr
    card: GooglePayCard
    authentication_method: GooglePayAuthenticationMethodOrStr
    cryptogram: Optional[str] = UNSET
    eci_indicator: Optional[str] = UNSET

class GooglePayDecryptedTokenDataDict(TypedDict):
    message_id: NotRequired[str]
    message_expiration: NotRequired[str]
    payment_method: GooglePayPaymentMethodOrStr
    card: GooglePayCardDict
    authentication_method: GooglePayAuthenticationMethodOrStr
    cryptogram: NotRequired[str]
    eci_indicator: NotRequired[str]
