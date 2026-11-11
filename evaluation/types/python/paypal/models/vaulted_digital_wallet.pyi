from __future__ import annotations
from typing_extensions import NotRequired, TypedDict
from ..core import UNSET, Optional, SdkBaseModel
from .enums.pay_pal_payment_token_customer_type import PayPalPaymentTokenCustomerTypeOrStr
from .enums.pay_pal_payment_token_usage_type import PayPalPaymentTokenUsageTypeOrStr
from .enums.usage_pattern import UsagePatternOrStr
from .vaulted_digital_wallet_shipping_details import VaultedDigitalWalletShippingDetails, VaultedDigitalWalletShippingDetailsDict

class VaultedDigitalWallet(SdkBaseModel):
    description: Optional[str] = UNSET
    usage_pattern: Optional[UsagePatternOrStr] = UNSET
    shipping: Optional[VaultedDigitalWalletShippingDetails] = UNSET
    permit_multiple_payment_tokens: bool = False
    usage_type: Optional[PayPalPaymentTokenUsageTypeOrStr] = UNSET
    customer_type: Optional[PayPalPaymentTokenCustomerTypeOrStr] = UNSET

class VaultedDigitalWalletDict(TypedDict):
    description: NotRequired[str]
    usage_pattern: NotRequired[UsagePatternOrStr]
    shipping: NotRequired[VaultedDigitalWalletShippingDetailsDict]
    permit_multiple_payment_tokens: NotRequired[bool]
    usage_type: NotRequired[PayPalPaymentTokenUsageTypeOrStr]
    customer_type: NotRequired[PayPalPaymentTokenCustomerTypeOrStr]
