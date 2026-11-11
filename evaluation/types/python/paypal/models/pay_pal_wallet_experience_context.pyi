from __future__ import annotations
from typing_extensions import NotRequired, TypedDict
from ..core import UNSET, Optional, SdkBaseModel
from .app_switch_context import AppSwitchContext, AppSwitchContextDict
from .callback_configuration import CallbackConfiguration, CallbackConfigurationDict
from .enums.pay_pal_experience_landing_page import PayPalExperienceLandingPage, PayPalExperienceLandingPageOrStr
from .enums.pay_pal_experience_user_action import PayPalExperienceUserAction, PayPalExperienceUserActionOrStr
from .enums.pay_pal_wallet_contact_preference import PayPalWalletContactPreference, PayPalWalletContactPreferenceOrStr
from .enums.pay_pal_wallet_context_shipping_preference import PayPalWalletContextShippingPreference, PayPalWalletContextShippingPreferenceOrStr
from .enums.payee_payment_method_preference import PayeePaymentMethodPreference, PayeePaymentMethodPreferenceOrStr

class PayPalWalletExperienceContext(SdkBaseModel):
    brand_name: Optional[str] = UNSET
    locale: Optional[str] = UNSET
    shipping_preference: PayPalWalletContextShippingPreferenceOrStr = PayPalWalletContextShippingPreference.GET_FROM_FILE
    contact_preference: PayPalWalletContactPreferenceOrStr = PayPalWalletContactPreference.NO_CONTACT_INFO
    return_url: Optional[str] = UNSET
    cancel_url: Optional[str] = UNSET
    app_switch_context: Optional[AppSwitchContext] = UNSET
    landing_page: PayPalExperienceLandingPageOrStr = PayPalExperienceLandingPage.NO_PREFERENCE
    user_action: PayPalExperienceUserActionOrStr = PayPalExperienceUserAction.CONTINUE
    payment_method_preference: PayeePaymentMethodPreferenceOrStr = PayeePaymentMethodPreference.UNRESTRICTED
    order_update_callback_config: Optional[CallbackConfiguration] = UNSET

class PayPalWalletExperienceContextDict(TypedDict):
    brand_name: NotRequired[str]
    locale: NotRequired[str]
    shipping_preference: NotRequired[PayPalWalletContextShippingPreferenceOrStr]
    contact_preference: NotRequired[PayPalWalletContactPreferenceOrStr]
    return_url: NotRequired[str]
    cancel_url: NotRequired[str]
    app_switch_context: NotRequired[AppSwitchContextDict]
    landing_page: NotRequired[PayPalExperienceLandingPageOrStr]
    user_action: NotRequired[PayPalExperienceUserActionOrStr]
    payment_method_preference: NotRequired[PayeePaymentMethodPreferenceOrStr]
    order_update_callback_config: NotRequired[CallbackConfigurationDict]
