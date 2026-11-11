from __future__ import annotations
from typing_extensions import NotRequired, TypedDict
from ..core import UNSET, Optional, SdkBaseModel
from .enums.application_context_user_action import ApplicationContextUserAction, ApplicationContextUserActionOrStr
from .enums.experience_context_shipping_preference import ExperienceContextShippingPreference, ExperienceContextShippingPreferenceOrStr
from .payment_method import PaymentMethod, PaymentMethodDict

class SubscriptionApplicationContext(SdkBaseModel):
    brand_name: Optional[str] = UNSET
    locale: Optional[str] = UNSET
    shipping_preference: ExperienceContextShippingPreferenceOrStr = ExperienceContextShippingPreference.GET_FROM_FILE
    user_action: ApplicationContextUserActionOrStr = ApplicationContextUserAction.SUBSCRIBE_NOW
    payment_method: Optional[PaymentMethod] = UNSET
    return_url: str
    cancel_url: str

class SubscriptionApplicationContextDict(TypedDict):
    brand_name: NotRequired[str]
    locale: NotRequired[str]
    shipping_preference: NotRequired[ExperienceContextShippingPreferenceOrStr]
    user_action: NotRequired[ApplicationContextUserActionOrStr]
    payment_method: NotRequired[PaymentMethodDict]
    return_url: str
    cancel_url: str
