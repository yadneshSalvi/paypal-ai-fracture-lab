from __future__ import annotations
from typing_extensions import NotRequired, TypedDict
from ..core import UNSET, Optional, SdkBaseModel
from .google_pay_card_response import GooglePayCardResponse, GooglePayCardResponseDict
from .phone_number_with_country_code import PhoneNumberWithCountryCode, PhoneNumberWithCountryCodeDict

class GooglePayWalletResponse(SdkBaseModel):
    name: Optional[str] = UNSET
    email_address: Optional[str] = UNSET
    phone_number: Optional[PhoneNumberWithCountryCode] = UNSET
    card: Optional[GooglePayCardResponse] = UNSET

class GooglePayWalletResponseDict(TypedDict):
    name: NotRequired[str]
    email_address: NotRequired[str]
    phone_number: NotRequired[PhoneNumberWithCountryCodeDict]
    card: NotRequired[GooglePayCardResponseDict]
