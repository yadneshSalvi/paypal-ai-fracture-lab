from __future__ import annotations
from typing_extensions import NotRequired, TypedDict
from ..core import UNSET, Optional, SdkBaseModel
from .enums.store_in_vault_instruction import StoreInVaultInstructionOrStr
from .enums.venmo_payment_token_customer_type import VenmoPaymentTokenCustomerType, VenmoPaymentTokenCustomerTypeOrStr
from .enums.venmo_payment_token_usage_pattern import VenmoPaymentTokenUsagePatternOrStr
from .enums.venmo_payment_token_usage_type import VenmoPaymentTokenUsageTypeOrStr

class VenmoWalletVaultAttributes(SdkBaseModel):
    store_in_vault: StoreInVaultInstructionOrStr
    description: Optional[str] = UNSET
    usage_pattern: Optional[VenmoPaymentTokenUsagePatternOrStr] = UNSET
    usage_type: VenmoPaymentTokenUsageTypeOrStr
    customer_type: VenmoPaymentTokenCustomerTypeOrStr = VenmoPaymentTokenCustomerType.CONSUMER
    permit_multiple_payment_tokens: bool = False

class VenmoWalletVaultAttributesDict(TypedDict):
    store_in_vault: StoreInVaultInstructionOrStr
    description: NotRequired[str]
    usage_pattern: NotRequired[VenmoPaymentTokenUsagePatternOrStr]
    usage_type: VenmoPaymentTokenUsageTypeOrStr
    customer_type: NotRequired[VenmoPaymentTokenCustomerTypeOrStr]
    permit_multiple_payment_tokens: NotRequired[bool]
