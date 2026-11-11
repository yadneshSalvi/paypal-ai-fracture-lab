from __future__ import annotations
from typing_extensions import NotRequired, TypedDict
from ..core import UNSET, Optional, SdkBaseModel
from .card_vault_response import CardVaultResponse, CardVaultResponseDict

class CardAttributesResponse(SdkBaseModel):
    vault: Optional[CardVaultResponse] = UNSET

class CardAttributesResponseDict(TypedDict):
    vault: NotRequired[CardVaultResponseDict]
