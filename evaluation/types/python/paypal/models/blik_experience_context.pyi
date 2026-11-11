from __future__ import annotations
from typing_extensions import NotRequired, TypedDict
from ..core import UNSET, Optional, SdkBaseModel
from .enums.experience_context_shipping_preference import ExperienceContextShippingPreference, ExperienceContextShippingPreferenceOrStr

class BlikExperienceContext(SdkBaseModel):
    brand_name: Optional[str] = UNSET
    locale: Optional[str] = UNSET
    shipping_preference: ExperienceContextShippingPreferenceOrStr = ExperienceContextShippingPreference.GET_FROM_FILE
    return_url: Optional[str] = UNSET
    cancel_url: Optional[str] = UNSET
    consumer_ip: Optional[str] = UNSET
    consumer_user_agent: Optional[str] = UNSET

class BlikExperienceContextDict(TypedDict):
    brand_name: NotRequired[str]
    locale: NotRequired[str]
    shipping_preference: NotRequired[ExperienceContextShippingPreferenceOrStr]
    return_url: NotRequired[str]
    cancel_url: NotRequired[str]
    consumer_ip: NotRequired[str]
    consumer_user_agent: NotRequired[str]
