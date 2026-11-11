from __future__ import annotations
from typing_extensions import NotRequired, TypedDict
from ..core import UNSET, Optional, SdkBaseModel
from .app_switch_context import AppSwitchContext, AppSwitchContextDict
from .enums.experience_context_shipping_preference import ExperienceContextShippingPreference, ExperienceContextShippingPreferenceOrStr
from .enums.vault_instruction_action import VaultInstructionActionOrStr
from .enums.vault_user_action import VaultUserAction, VaultUserActionOrStr

class VaultExperienceContext(SdkBaseModel):
    brand_name: Optional[str] = UNSET
    locale: Optional[str] = UNSET
    return_url: Optional[str] = UNSET
    cancel_url: Optional[str] = UNSET
    shipping_preference: ExperienceContextShippingPreferenceOrStr = ExperienceContextShippingPreference.GET_FROM_FILE
    vault_instruction: Optional[VaultInstructionActionOrStr] = UNSET
    app_switch_context: Optional[AppSwitchContext] = UNSET
    user_action: VaultUserActionOrStr = VaultUserAction.CONTINUE

class VaultExperienceContextDict(TypedDict):
    brand_name: NotRequired[str]
    locale: NotRequired[str]
    return_url: NotRequired[str]
    cancel_url: NotRequired[str]
    shipping_preference: NotRequired[ExperienceContextShippingPreferenceOrStr]
    vault_instruction: NotRequired[VaultInstructionActionOrStr]
    app_switch_context: NotRequired[AppSwitchContextDict]
    user_action: NotRequired[VaultUserActionOrStr]
