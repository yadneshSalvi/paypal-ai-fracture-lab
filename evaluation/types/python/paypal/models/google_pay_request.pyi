from __future__ import annotations
from typing_extensions import NotRequired, TypedDict
from ..core import UNSET, Optional, SdkBaseModel
from .assurance_details import AssuranceDetails, AssuranceDetailsDict
from .google_pay_decrypted_token_data import GooglePayDecryptedTokenData, GooglePayDecryptedTokenDataDict
from .google_pay_experience_context import GooglePayExperienceContext, GooglePayExperienceContextDict
from .google_pay_request_card import GooglePayRequestCard, GooglePayRequestCardDict
from .phone_number_with_country_code import PhoneNumberWithCountryCode, PhoneNumberWithCountryCodeDict

class GooglePayRequest(SdkBaseModel):
    name: Optional[str] = UNSET
    email_address: Optional[str] = UNSET
    phone_number: Optional[PhoneNumberWithCountryCode] = UNSET
    card: Optional[GooglePayRequestCard] = UNSET
    decrypted_token: Optional[GooglePayDecryptedTokenData] = UNSET
    assurance_details: Optional[AssuranceDetails] = UNSET
    experience_context: Optional[GooglePayExperienceContext] = UNSET

class GooglePayRequestDict(TypedDict):
    name: NotRequired[str]
    email_address: NotRequired[str]
    phone_number: NotRequired[PhoneNumberWithCountryCodeDict]
    card: NotRequired[GooglePayRequestCardDict]
    decrypted_token: NotRequired[GooglePayDecryptedTokenDataDict]
    assurance_details: NotRequired[AssuranceDetailsDict]
    experience_context: NotRequired[GooglePayExperienceContextDict]
