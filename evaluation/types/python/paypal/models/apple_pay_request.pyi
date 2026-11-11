from __future__ import annotations
from typing_extensions import NotRequired, TypedDict
from ..core import UNSET, Optional, SdkBaseModel
from .apple_pay_attributes import ApplePayAttributes, ApplePayAttributesDict
from .apple_pay_decrypted_token_data import ApplePayDecryptedTokenData, ApplePayDecryptedTokenDataDict
from .apple_pay_experience_context import ApplePayExperienceContext, ApplePayExperienceContextDict
from .card_stored_credential import CardStoredCredential, CardStoredCredentialDict
from .phone_number import PhoneNumber, PhoneNumberDict

class ApplePayRequest(SdkBaseModel):
    id: Optional[str] = UNSET
    name: Optional[str] = UNSET
    email_address: Optional[str] = UNSET
    phone_number: Optional[PhoneNumber] = UNSET
    decrypted_token: Optional[ApplePayDecryptedTokenData] = UNSET
    stored_credential: Optional[CardStoredCredential] = UNSET
    vault_id: Optional[str] = UNSET
    attributes: Optional[ApplePayAttributes] = UNSET
    experience_context: Optional[ApplePayExperienceContext] = UNSET

class ApplePayRequestDict(TypedDict):
    id: NotRequired[str]
    name: NotRequired[str]
    email_address: NotRequired[str]
    phone_number: NotRequired[PhoneNumberDict]
    decrypted_token: NotRequired[ApplePayDecryptedTokenDataDict]
    stored_credential: NotRequired[CardStoredCredentialDict]
    vault_id: NotRequired[str]
    attributes: NotRequired[ApplePayAttributesDict]
    experience_context: NotRequired[ApplePayExperienceContextDict]
