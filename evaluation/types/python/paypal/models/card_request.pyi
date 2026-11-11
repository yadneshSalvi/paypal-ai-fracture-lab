from __future__ import annotations
from typing_extensions import NotRequired, TypedDict
from ..core import UNSET, Optional, SdkBaseModel
from .address import Address, AddressDict
from .card_attributes import CardAttributes, CardAttributesDict
from .card_experience_context import CardExperienceContext, CardExperienceContextDict
from .card_stored_credential import CardStoredCredential, CardStoredCredentialDict
from .network_token import NetworkToken, NetworkTokenDict

class CardRequest(SdkBaseModel):
    name: Optional[str] = UNSET
    number: Optional[str] = UNSET
    expiry: Optional[str] = UNSET
    security_code: Optional[str] = UNSET
    billing_address: Optional[Address] = UNSET
    attributes: Optional[CardAttributes] = UNSET
    vault_id: Optional[str] = UNSET
    single_use_token: Optional[str] = UNSET
    stored_credential: Optional[CardStoredCredential] = UNSET
    network_token: Optional[NetworkToken] = UNSET
    experience_context: Optional[CardExperienceContext] = UNSET

class CardRequestDict(TypedDict):
    name: NotRequired[str]
    number: NotRequired[str]
    expiry: NotRequired[str]
    security_code: NotRequired[str]
    billing_address: NotRequired[AddressDict]
    attributes: NotRequired[CardAttributesDict]
    vault_id: NotRequired[str]
    single_use_token: NotRequired[str]
    stored_credential: NotRequired[CardStoredCredentialDict]
    network_token: NotRequired[NetworkTokenDict]
    experience_context: NotRequired[CardExperienceContextDict]
