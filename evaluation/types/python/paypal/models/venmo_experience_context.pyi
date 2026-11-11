from __future__ import annotations
from typing_extensions import NotRequired, TypedDict
from ..core import UNSET, Optional, SdkBaseModel
from .enums.experience_context_shipping_preference import ExperienceContextShippingPreference, ExperienceContextShippingPreferenceOrStr
from .enums.vault_instruction_action import VaultInstructionActionOrStr
from .enums.vault_user_action import VaultUserAction, VaultUserActionOrStr

class VenmoExperienceContext(SdkBaseModel):
    brand_name: Optional[str] = UNSET
    shipping_preference: ExperienceContextShippingPreferenceOrStr = ExperienceContextShippingPreference.GET_FROM_FILE
    vault_instruction: Optional[VaultInstructionActionOrStr] = UNSET
    user_action: VaultUserActionOrStr = VaultUserAction.CONTINUE

class VenmoExperienceContextDict(TypedDict):
    brand_name: NotRequired[str]
    shipping_preference: NotRequired[ExperienceContextShippingPreferenceOrStr]
    vault_instruction: NotRequired[VaultInstructionActionOrStr]
    user_action: NotRequired[VaultUserActionOrStr]
