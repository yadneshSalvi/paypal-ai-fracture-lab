from __future__ import annotations
from typing_extensions import NotRequired, TypedDict
from ..core import UNSET, Optional, SdkBaseModel
from .address import Address, AddressDict
from .enums.pay_pal_payment_token_customer_type import PayPalPaymentTokenCustomerTypeOrStr
from .enums.pay_pal_payment_token_usage_type import PayPalPaymentTokenUsageTypeOrStr
from .enums.usage_pattern import UsagePatternOrStr
from .name import Name, NameDict
from .phone_with_type import PhoneWithType, PhoneWithTypeDict
from .vaulted_digital_wallet_shipping_details import VaultedDigitalWalletShippingDetails, VaultedDigitalWalletShippingDetailsDict

class VenmoPaymentToken(SdkBaseModel):
    description: Optional[str] = UNSET
    usage_pattern: Optional[UsagePatternOrStr] = UNSET
    shipping: Optional[VaultedDigitalWalletShippingDetails] = UNSET
    permit_multiple_payment_tokens: bool = False
    usage_type: Optional[PayPalPaymentTokenUsageTypeOrStr] = UNSET
    customer_type: Optional[PayPalPaymentTokenCustomerTypeOrStr] = UNSET
    email_address: Optional[str] = UNSET
    payer_id: Optional[str] = UNSET
    name: Optional[Name] = UNSET
    phone: Optional[PhoneWithType] = UNSET
    address: Optional[Address] = UNSET
    user_name: Optional[str] = UNSET

class VenmoPaymentTokenDict(TypedDict):
    description: NotRequired[str]
    usage_pattern: NotRequired[UsagePatternOrStr]
    shipping: NotRequired[VaultedDigitalWalletShippingDetailsDict]
    permit_multiple_payment_tokens: NotRequired[bool]
    usage_type: NotRequired[PayPalPaymentTokenUsageTypeOrStr]
    customer_type: NotRequired[PayPalPaymentTokenCustomerTypeOrStr]
    email_address: NotRequired[str]
    payer_id: NotRequired[str]
    name: NotRequired[NameDict]
    phone: NotRequired[PhoneWithTypeDict]
    address: NotRequired[AddressDict]
    user_name: NotRequired[str]
