from __future__ import annotations
from typing_extensions import NotRequired, TypedDict
from ..core import UNSET, Optional, SdkBaseModel
from .bank_request import BankRequest, BankRequestDict
from .setup_token_request_card import SetupTokenRequestCard, SetupTokenRequestCardDict
from .vault_apple_pay_request import VaultApplePayRequest, VaultApplePayRequestDict
from .vault_pay_pal_wallet_request import VaultPayPalWalletRequest, VaultPayPalWalletRequestDict
from .vault_token_request import VaultTokenRequest, VaultTokenRequestDict
from .vault_venmo_request import VaultVenmoRequest, VaultVenmoRequestDict

class SetupTokenRequestPaymentSource(SdkBaseModel):
    card: Optional[SetupTokenRequestCard] = UNSET
    paypal: Optional[VaultPayPalWalletRequest] = UNSET
    venmo: Optional[VaultVenmoRequest] = UNSET
    apple_pay: Optional[VaultApplePayRequest] = UNSET
    token: Optional[VaultTokenRequest] = UNSET
    bank: Optional[BankRequest] = UNSET

class SetupTokenRequestPaymentSourceDict(TypedDict):
    card: NotRequired[SetupTokenRequestCardDict]
    paypal: NotRequired[VaultPayPalWalletRequestDict]
    venmo: NotRequired[VaultVenmoRequestDict]
    apple_pay: NotRequired[VaultApplePayRequestDict]
    token: NotRequired[VaultTokenRequestDict]
    bank: NotRequired[BankRequestDict]
