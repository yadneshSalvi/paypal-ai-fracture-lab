from __future__ import annotations
from typing_extensions import NotRequired, TypedDict
from ..core import UNSET, Optional, SdkBaseModel
from .card_customer_information import CardCustomerInformation, CardCustomerInformationDict
from .enums.vault_status import VaultStatusOrStr
from .link_description import LinkDescription, LinkDescriptionDict

class CardVaultResponse(SdkBaseModel):
    id: Optional[str] = UNSET
    status: Optional[VaultStatusOrStr] = UNSET
    links: Optional[list[LinkDescription]] = UNSET
    customer: Optional[CardCustomerInformation] = UNSET

class CardVaultResponseDict(TypedDict):
    id: NotRequired[str]
    status: NotRequired[VaultStatusOrStr]
    links: NotRequired[list[LinkDescriptionDict]]
    customer: NotRequired[CardCustomerInformationDict]
