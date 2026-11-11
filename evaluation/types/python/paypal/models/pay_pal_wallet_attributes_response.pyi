from __future__ import annotations
from typing_extensions import NotRequired, TypedDict
from ..core import UNSET, Optional, SdkBaseModel
from .cobranded_card import CobrandedCard, CobrandedCardDict
from .pay_pal_wallet_vault_response import PayPalWalletVaultResponse, PayPalWalletVaultResponseDict

class PayPalWalletAttributesResponse(SdkBaseModel):
    vault: Optional[PayPalWalletVaultResponse] = UNSET
    cobranded_cards: Optional[list[CobrandedCard]] = UNSET

class PayPalWalletAttributesResponseDict(TypedDict):
    vault: NotRequired[PayPalWalletVaultResponseDict]
    cobranded_cards: NotRequired[list[CobrandedCardDict]]
