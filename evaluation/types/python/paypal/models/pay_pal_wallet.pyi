from __future__ import annotations
from typing_extensions import NotRequired, TypedDict
from ..core import UNSET, Optional, SdkBaseModel
from .address import Address, AddressDict
from .name import Name, NameDict
from .pay_pal_wallet_attributes import PayPalWalletAttributes, PayPalWalletAttributesDict
from .pay_pal_wallet_experience_context import PayPalWalletExperienceContext, PayPalWalletExperienceContextDict
from .pay_pal_wallet_stored_credential import PayPalWalletStoredCredential, PayPalWalletStoredCredentialDict
from .phone_with_type import PhoneWithType, PhoneWithTypeDict
from .tax_info import TaxInfo, TaxInfoDict

class PayPalWallet(SdkBaseModel):
    vault_id: Optional[str] = UNSET
    email_address: Optional[str] = UNSET
    name: Optional[Name] = UNSET
    phone: Optional[PhoneWithType] = UNSET
    birth_date: Optional[str] = UNSET
    tax_info: Optional[TaxInfo] = UNSET
    address: Optional[Address] = UNSET
    attributes: Optional[PayPalWalletAttributes] = UNSET
    experience_context: Optional[PayPalWalletExperienceContext] = UNSET
    billing_agreement_id: Optional[str] = UNSET
    stored_credential: Optional[PayPalWalletStoredCredential] = UNSET

class PayPalWalletDict(TypedDict):
    vault_id: NotRequired[str]
    email_address: NotRequired[str]
    name: NotRequired[NameDict]
    phone: NotRequired[PhoneWithTypeDict]
    birth_date: NotRequired[str]
    tax_info: NotRequired[TaxInfoDict]
    address: NotRequired[AddressDict]
    attributes: NotRequired[PayPalWalletAttributesDict]
    experience_context: NotRequired[PayPalWalletExperienceContextDict]
    billing_agreement_id: NotRequired[str]
    stored_credential: NotRequired[PayPalWalletStoredCredentialDict]
