from __future__ import annotations
from typing_extensions import NotRequired, TypedDict
from ..core import UNSET, Optional, SdkBaseModel
from .enums.experience_context_shipping_preference import ExperienceContextShippingPreference, ExperienceContextShippingPreferenceOrStr
from .payment_method import PaymentMethod, PaymentMethodDict

class SubscriptionPatchApplicationContext(SdkBaseModel):
    brand_name: Optional[str] = UNSET
    locale: Optional[str] = UNSET
    shipping_preference: ExperienceContextShippingPreferenceOrStr = ExperienceContextShippingPreference.GET_FROM_FILE
    payment_method: Optional[PaymentMethod] = UNSET
    return_url: str
    cancel_url: str

class SubscriptionPatchApplicationContextDict(TypedDict):
    brand_name: NotRequired[str]
    locale: NotRequired[str]
    shipping_preference: NotRequired[ExperienceContextShippingPreferenceOrStr]
    payment_method: NotRequired[PaymentMethodDict]
    return_url: str
    cancel_url: str
