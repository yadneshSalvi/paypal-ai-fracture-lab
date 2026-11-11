from __future__ import annotations
from typing_extensions import NotRequired, TypedDict
from ..core import UNSET, Optional, SdkBaseModel
from .enums.vault_status import VaultStatusOrStr
from .link_description import LinkDescription, LinkDescriptionDict
from .vault_customer import VaultCustomer, VaultCustomerDict

class VaultResponse(SdkBaseModel):
    id: Optional[str] = UNSET
    status: Optional[VaultStatusOrStr] = UNSET
    customer: Optional[VaultCustomer] = UNSET
    links: Optional[list[LinkDescription]] = UNSET

class VaultResponseDict(TypedDict):
    id: NotRequired[str]
    status: NotRequired[VaultStatusOrStr]
    customer: NotRequired[VaultCustomerDict]
    links: NotRequired[list[LinkDescriptionDict]]
