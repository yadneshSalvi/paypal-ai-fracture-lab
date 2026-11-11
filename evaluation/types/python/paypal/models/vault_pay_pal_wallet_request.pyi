from __future__ import annotations
from typing_extensions import NotRequired, TypedDict
from ..core import UNSET, Optional, SdkBaseModel
from .enums.pay_pal_payment_token_customer_type import PayPalPaymentTokenCustomerTypeOrStr
from .enums.pay_pal_payment_token_usage_type import PayPalPaymentTokenUsageTypeOrStr
from .enums.usage_pattern import UsagePatternOrStr
from .plan import Plan, PlanDict
from .vault_experience_context import VaultExperienceContext, VaultExperienceContextDict
from .vaulted_digital_wallet_shipping_details import VaultedDigitalWalletShippingDetails, VaultedDigitalWalletShippingDetailsDict

class VaultPayPalWalletRequest(SdkBaseModel):
    description: Optional[str] = UNSET
    usage_pattern: Optional[UsagePatternOrStr] = UNSET
    shipping: Optional[VaultedDigitalWalletShippingDetails] = UNSET
    permit_multiple_payment_tokens: bool = False
    usage_type: Optional[PayPalPaymentTokenUsageTypeOrStr] = UNSET
    customer_type: Optional[PayPalPaymentTokenCustomerTypeOrStr] = UNSET
    billing_plan: Optional[Plan] = UNSET
    experience_context: Optional[VaultExperienceContext] = UNSET

class VaultPayPalWalletRequestDict(TypedDict):
    description: NotRequired[str]
    usage_pattern: NotRequired[UsagePatternOrStr]
    shipping: NotRequired[VaultedDigitalWalletShippingDetailsDict]
    permit_multiple_payment_tokens: NotRequired[bool]
    usage_type: NotRequired[PayPalPaymentTokenUsageTypeOrStr]
    customer_type: NotRequired[PayPalPaymentTokenCustomerTypeOrStr]
    billing_plan: NotRequired[PlanDict]
    experience_context: NotRequired[VaultExperienceContextDict]
