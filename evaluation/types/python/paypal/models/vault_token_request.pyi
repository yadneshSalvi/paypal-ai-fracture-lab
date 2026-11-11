from __future__ import annotations
from pydantic import Field
from typing_extensions import TypedDict
from ..core import SdkBaseModel
from .enums.vault_token_request_type import VaultTokenRequestTypeOrStr

class VaultTokenRequest(SdkBaseModel):
    id: str
    type_: VaultTokenRequestTypeOrStr = Field(alias='type')

class VaultTokenRequestDict(TypedDict):
    id: str
    type_: VaultTokenRequestTypeOrStr
