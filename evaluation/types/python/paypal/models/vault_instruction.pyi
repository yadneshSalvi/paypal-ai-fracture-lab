from __future__ import annotations
from typing_extensions import TypedDict
from ..core import SdkBaseModel
from .enums.store_in_vault_instruction import StoreInVaultInstructionOrStr

class VaultInstruction(SdkBaseModel):
    store_in_vault: StoreInVaultInstructionOrStr

class VaultInstructionDict(TypedDict):
    store_in_vault: StoreInVaultInstructionOrStr
