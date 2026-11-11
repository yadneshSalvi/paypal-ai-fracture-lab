from __future__ import annotations
from typing_extensions import NotRequired, TypedDict
from ..core import UNSET, Optional, SdkBaseModel
from .apple_pay_attributes_response import ApplePayAttributesResponse, ApplePayAttributesResponseDict
from .apple_pay_card_response import ApplePayCardResponse, ApplePayCardResponseDict
from .card_stored_credential import CardStoredCredential, CardStoredCredentialDict
from .phone_number import PhoneNumber, PhoneNumberDict

class ApplePayPaymentObject(SdkBaseModel):
    id: Optional[str] = UNSET
    token: Optional[str] = UNSET
    name: Optional[str] = UNSET
    email_address: Optional[str] = UNSET
    phone_number: Optional[PhoneNumber] = UNSET
    card: Optional[ApplePayCardResponse] = UNSET
    attributes: Optional[ApplePayAttributesResponse] = UNSET
    stored_credential: Optional[CardStoredCredential] = UNSET

class ApplePayPaymentObjectDict(TypedDict):
    id: NotRequired[str]
    token: NotRequired[str]
    name: NotRequired[str]
    email_address: NotRequired[str]
    phone_number: NotRequired[PhoneNumberDict]
    card: NotRequired[ApplePayCardResponseDict]
    attributes: NotRequired[ApplePayAttributesResponseDict]
    stored_credential: NotRequired[CardStoredCredentialDict]
