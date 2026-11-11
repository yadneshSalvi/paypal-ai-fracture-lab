from __future__ import annotations
from typing_extensions import NotRequired, TypedDict
from ..core import UNSET, Optional, SdkBaseModel
from .enums.vault_instruction_action import VaultInstructionActionOrStr
from .enums.vault_user_action import VaultUserAction, VaultUserActionOrStr

class VaultCardExperienceContext(SdkBaseModel):
    brand_name: Optional[str] = UNSET
    locale: Optional[str] = UNSET
    return_url: Optional[str] = UNSET
    cancel_url: Optional[str] = UNSET
    vault_instruction: Optional[VaultInstructionActionOrStr] = UNSET
    user_action: VaultUserActionOrStr = VaultUserAction.CONTINUE

class VaultCardExperienceContextDict(TypedDict):
    brand_name: NotRequired[str]
    locale: NotRequired[str]
    return_url: NotRequired[str]
    cancel_url: NotRequired[str]
    vault_instruction: NotRequired[VaultInstructionActionOrStr]
    user_action: NotRequired[VaultUserActionOrStr]
