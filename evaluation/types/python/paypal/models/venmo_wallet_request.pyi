from __future__ import annotations
from typing_extensions import NotRequired, TypedDict
from ..core import UNSET, Optional, SdkBaseModel
from .venmo_wallet_additional_attributes import VenmoWalletAdditionalAttributes, VenmoWalletAdditionalAttributesDict
from .venmo_wallet_experience_context import VenmoWalletExperienceContext, VenmoWalletExperienceContextDict

class VenmoWalletRequest(SdkBaseModel):
    vault_id: Optional[str] = UNSET
    email_address: Optional[str] = UNSET
    experience_context: Optional[VenmoWalletExperienceContext] = UNSET
    attributes: Optional[VenmoWalletAdditionalAttributes] = UNSET

class VenmoWalletRequestDict(TypedDict):
    vault_id: NotRequired[str]
    email_address: NotRequired[str]
    experience_context: NotRequired[VenmoWalletExperienceContextDict]
    attributes: NotRequired[VenmoWalletAdditionalAttributesDict]
