from __future__ import annotations
from typing_extensions import NotRequired, TypedDict
from ..core import UNSET, Optional, SdkBaseModel
from .pay_pal_wallet_customer_request import PayPalWalletCustomerRequest, PayPalWalletCustomerRequestDict
from .pay_pal_wallet_vault_instruction import PayPalWalletVaultInstruction, PayPalWalletVaultInstructionDict

class PayPalWalletAttributes(SdkBaseModel):
    customer: Optional[PayPalWalletCustomerRequest] = UNSET
    vault: Optional[PayPalWalletVaultInstruction] = UNSET

class PayPalWalletAttributesDict(TypedDict):
    customer: NotRequired[PayPalWalletCustomerRequestDict]
    vault: NotRequired[PayPalWalletVaultInstructionDict]
