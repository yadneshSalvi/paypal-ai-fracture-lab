from __future__ import annotations
from typing_extensions import NotRequired, TypedDict
from ..core import UNSET, Optional, SdkBaseModel
from .callback_configuration import CallbackConfiguration, CallbackConfigurationDict
from .enums.venmo_wallet_experience_context_shipping_preference import VenmoWalletExperienceContextShippingPreference, VenmoWalletExperienceContextShippingPreferenceOrStr
from .enums.venmo_wallet_experience_context_user_action import VenmoWalletExperienceContextUserAction, VenmoWalletExperienceContextUserActionOrStr

class VenmoWalletExperienceContext(SdkBaseModel):
    brand_name: Optional[str] = UNSET
    shipping_preference: VenmoWalletExperienceContextShippingPreferenceOrStr = VenmoWalletExperienceContextShippingPreference.GET_FROM_FILE
    order_update_callback_config: Optional[CallbackConfiguration] = UNSET
    user_action: VenmoWalletExperienceContextUserActionOrStr = VenmoWalletExperienceContextUserAction.CONTINUE

class VenmoWalletExperienceContextDict(TypedDict):
    brand_name: NotRequired[str]
    shipping_preference: NotRequired[VenmoWalletExperienceContextShippingPreferenceOrStr]
    order_update_callback_config: NotRequired[CallbackConfigurationDict]
    user_action: NotRequired[VenmoWalletExperienceContextUserActionOrStr]
