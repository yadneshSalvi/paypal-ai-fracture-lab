from __future__ import annotations
from typing_extensions import NotRequired, TypedDict
from ..core import UNSET, Optional, SdkBaseModel
from .enums.pay_pal_payment_token_customer_type import PayPalPaymentTokenCustomerType, PayPalPaymentTokenCustomerTypeOrStr
from .enums.store_in_vault_instruction import StoreInVaultInstructionOrStr
from .enums.usage_pattern import UsagePatternOrStr
from .enums.usage_type import UsageTypeOrStr

class PayPalWalletVaultBase(SdkBaseModel):
    store_in_vault: Optional[StoreInVaultInstructionOrStr] = UNSET
    description: Optional[str] = UNSET
    usage_pattern: Optional[UsagePatternOrStr] = UNSET
    usage_type: Optional[UsageTypeOrStr] = UNSET
    customer_type: PayPalPaymentTokenCustomerTypeOrStr = PayPalPaymentTokenCustomerType.CONSUMER
    permit_multiple_payment_tokens: bool = False

class PayPalWalletVaultBaseDict(TypedDict):
    store_in_vault: NotRequired[StoreInVaultInstructionOrStr]
    description: NotRequired[str]
    usage_pattern: NotRequired[UsagePatternOrStr]
    usage_type: NotRequired[UsageTypeOrStr]
    customer_type: NotRequired[PayPalPaymentTokenCustomerTypeOrStr]
    permit_multiple_payment_tokens: NotRequired[bool]
