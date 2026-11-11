from __future__ import annotations
from typing_extensions import NotRequired, TypedDict
from ..core import UNSET, Optional, SdkBaseModel
from .enums.pay_pal_payment_token_customer_type import PayPalPaymentTokenCustomerType, PayPalPaymentTokenCustomerTypeOrStr
from .enums.pay_pal_payment_token_usage_type import PayPalPaymentTokenUsageTypeOrStr
from .enums.store_in_vault_instruction import StoreInVaultInstructionOrStr
from .enums.usage_pattern import UsagePatternOrStr

class PayPalWalletVaultInstruction(SdkBaseModel):
    store_in_vault: Optional[StoreInVaultInstructionOrStr] = UNSET
    description: Optional[str] = UNSET
    usage_pattern: Optional[UsagePatternOrStr] = UNSET
    usage_type: PayPalPaymentTokenUsageTypeOrStr
    customer_type: PayPalPaymentTokenCustomerTypeOrStr = PayPalPaymentTokenCustomerType.CONSUMER
    permit_multiple_payment_tokens: bool = False

class PayPalWalletVaultInstructionDict(TypedDict):
    store_in_vault: NotRequired[StoreInVaultInstructionOrStr]
    description: NotRequired[str]
    usage_pattern: NotRequired[UsagePatternOrStr]
    usage_type: PayPalPaymentTokenUsageTypeOrStr
    customer_type: NotRequired[PayPalPaymentTokenCustomerTypeOrStr]
    permit_multiple_payment_tokens: NotRequired[bool]
