from __future__ import annotations
from typing_extensions import NotRequired, TypedDict
from ..core import UNSET, Optional, SdkBaseModel
from .address import Address, AddressDict
from .enums.experience_status import ExperienceStatusOrStr
from .enums.pay_pal_wallet_account_verification_status import PayPalWalletAccountVerificationStatusOrStr
from .enums.phone_type import PhoneTypeOrStr
from .name import Name, NameDict
from .pay_pal_wallet_attributes_response import PayPalWalletAttributesResponse, PayPalWalletAttributesResponseDict
from .pay_pal_wallet_stored_credential import PayPalWalletStoredCredential, PayPalWalletStoredCredentialDict
from .phone_number import PhoneNumber, PhoneNumberDict
from .tax_info import TaxInfo, TaxInfoDict

class PayPalWalletResponse(SdkBaseModel):
    email_address: Optional[str] = UNSET
    account_id: Optional[str] = UNSET
    account_status: Optional[PayPalWalletAccountVerificationStatusOrStr] = UNSET
    name: Optional[Name] = UNSET
    phone_type: Optional[PhoneTypeOrStr] = UNSET
    phone_number: Optional[PhoneNumber] = UNSET
    birth_date: Optional[str] = UNSET
    business_name: Optional[str] = UNSET
    tax_info: Optional[TaxInfo] = UNSET
    address: Optional[Address] = UNSET
    attributes: Optional[PayPalWalletAttributesResponse] = UNSET
    stored_credential: Optional[PayPalWalletStoredCredential] = UNSET
    experience_status: Optional[ExperienceStatusOrStr] = UNSET

class PayPalWalletResponseDict(TypedDict):
    email_address: NotRequired[str]
    account_id: NotRequired[str]
    account_status: NotRequired[PayPalWalletAccountVerificationStatusOrStr]
    name: NotRequired[NameDict]
    phone_type: NotRequired[PhoneTypeOrStr]
    phone_number: NotRequired[PhoneNumberDict]
    birth_date: NotRequired[str]
    business_name: NotRequired[str]
    tax_info: NotRequired[TaxInfoDict]
    address: NotRequired[AddressDict]
    attributes: NotRequired[PayPalWalletAttributesResponseDict]
    stored_credential: NotRequired[PayPalWalletStoredCredentialDict]
    experience_status: NotRequired[ExperienceStatusOrStr]
