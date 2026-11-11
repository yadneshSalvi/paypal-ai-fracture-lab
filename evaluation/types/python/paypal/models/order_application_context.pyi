from __future__ import annotations
from typing_extensions import NotRequired, TypedDict
from ..core import UNSET, Optional, SdkBaseModel
from .enums.order_application_context_landing_page import OrderApplicationContextLandingPage, OrderApplicationContextLandingPageOrStr
from .enums.order_application_context_shipping_preference import OrderApplicationContextShippingPreference, OrderApplicationContextShippingPreferenceOrStr
from .enums.order_application_context_user_action import OrderApplicationContextUserAction, OrderApplicationContextUserActionOrStr
from .payment_method_preference import PaymentMethodPreference, PaymentMethodPreferenceDict
from .stored_payment_source import StoredPaymentSource, StoredPaymentSourceDict

class OrderApplicationContext(SdkBaseModel):
    brand_name: Optional[str] = UNSET
    locale: Optional[str] = UNSET
    landing_page: OrderApplicationContextLandingPageOrStr = OrderApplicationContextLandingPage.NO_PREFERENCE
    shipping_preference: OrderApplicationContextShippingPreferenceOrStr = OrderApplicationContextShippingPreference.GET_FROM_FILE
    user_action: OrderApplicationContextUserActionOrStr = OrderApplicationContextUserAction.CONTINUE
    payment_method: Optional[PaymentMethodPreference] = UNSET
    return_url: Optional[str] = UNSET
    cancel_url: Optional[str] = UNSET
    stored_payment_source: Optional[StoredPaymentSource] = UNSET

class OrderApplicationContextDict(TypedDict):
    brand_name: NotRequired[str]
    locale: NotRequired[str]
    landing_page: NotRequired[OrderApplicationContextLandingPageOrStr]
    shipping_preference: NotRequired[OrderApplicationContextShippingPreferenceOrStr]
    user_action: NotRequired[OrderApplicationContextUserActionOrStr]
    payment_method: NotRequired[PaymentMethodPreferenceDict]
    return_url: NotRequired[str]
    cancel_url: NotRequired[str]
    stored_payment_source: NotRequired[StoredPaymentSourceDict]
