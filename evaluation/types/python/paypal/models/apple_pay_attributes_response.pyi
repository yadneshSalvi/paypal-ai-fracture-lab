from __future__ import annotations
from typing_extensions import NotRequired, TypedDict
from ..core import UNSET, Optional, SdkBaseModel
from .vault_response import VaultResponse, VaultResponseDict

class ApplePayAttributesResponse(SdkBaseModel):
    vault: Optional[VaultResponse] = UNSET

class ApplePayAttributesResponseDict(TypedDict):
    vault: NotRequired[VaultResponseDict]
