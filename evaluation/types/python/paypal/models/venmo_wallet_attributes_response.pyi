from __future__ import annotations
from typing_extensions import NotRequired, TypedDict
from ..core import UNSET, Optional, SdkBaseModel
from .venmo_vault_response import VenmoVaultResponse, VenmoVaultResponseDict

class VenmoWalletAttributesResponse(SdkBaseModel):
    vault: Optional[VenmoVaultResponse] = UNSET

class VenmoWalletAttributesResponseDict(TypedDict):
    vault: NotRequired[VenmoVaultResponseDict]
