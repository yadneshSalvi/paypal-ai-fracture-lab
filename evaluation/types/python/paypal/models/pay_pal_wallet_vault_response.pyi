from __future__ import annotations
from typing_extensions import NotRequired, TypedDict
from ..core import UNSET, Optional, SdkBaseModel
from .enums.pay_pal_wallet_vault_status import PayPalWalletVaultStatusOrStr
from .link_description import LinkDescription, LinkDescriptionDict
from .pay_pal_wallet_customer import PayPalWalletCustomer, PayPalWalletCustomerDict

class PayPalWalletVaultResponse(SdkBaseModel):
    id: Optional[str] = UNSET
    status: Optional[PayPalWalletVaultStatusOrStr] = UNSET
    links: Optional[list[LinkDescription]] = UNSET
    customer: Optional[PayPalWalletCustomer] = UNSET

class PayPalWalletVaultResponseDict(TypedDict):
    id: NotRequired[str]
    status: NotRequired[PayPalWalletVaultStatusOrStr]
    links: NotRequired[list[LinkDescriptionDict]]
    customer: NotRequired[PayPalWalletCustomerDict]
