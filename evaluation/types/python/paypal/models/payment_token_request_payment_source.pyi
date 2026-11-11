from __future__ import annotations
from typing_extensions import NotRequired, TypedDict
from ..core import UNSET, Optional, SdkBaseModel
from .payment_token_request_card import PaymentTokenRequestCard, PaymentTokenRequestCardDict
from .vault_token_request import VaultTokenRequest, VaultTokenRequestDict

class PaymentTokenRequestPaymentSource(SdkBaseModel):
    card: Optional[PaymentTokenRequestCard] = UNSET
    token: Optional[VaultTokenRequest] = UNSET

class PaymentTokenRequestPaymentSourceDict(TypedDict):
    card: NotRequired[PaymentTokenRequestCardDict]
    token: NotRequired[VaultTokenRequestDict]
