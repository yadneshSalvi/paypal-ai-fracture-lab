from __future__ import annotations
from typing_extensions import NotRequired, TypedDict
from ..core import UNSET, Optional, SdkBaseModel
from .link_description import LinkDescription, LinkDescriptionDict
from .payment_token_response import PaymentTokenResponse, PaymentTokenResponseDict
from .vault_response_customer import VaultResponseCustomer, VaultResponseCustomerDict

class CustomerVaultPaymentTokensResponse(SdkBaseModel):
    total_items: Optional[int] = UNSET
    total_pages: Optional[int] = UNSET
    customer: Optional[VaultResponseCustomer] = UNSET
    payment_tokens: Optional[list[PaymentTokenResponse]] = UNSET
    links: Optional[list[LinkDescription]] = UNSET

class CustomerVaultPaymentTokensResponseDict(TypedDict):
    total_items: NotRequired[int]
    total_pages: NotRequired[int]
    customer: NotRequired[VaultResponseCustomerDict]
    payment_tokens: NotRequired[list[PaymentTokenResponseDict]]
    links: NotRequired[list[LinkDescriptionDict]]
