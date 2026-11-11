from __future__ import annotations
from typing_extensions import NotRequired, TypedDict
from ..core import UNSET, Optional, SdkBaseModel
from .enums.store_in_vault_instruction import StoreInVaultInstructionOrStr

class VaultInstructionBase(SdkBaseModel):
    store_in_vault: Optional[StoreInVaultInstructionOrStr] = UNSET

class VaultInstructionBaseDict(TypedDict):
    store_in_vault: NotRequired[StoreInVaultInstructionOrStr]
