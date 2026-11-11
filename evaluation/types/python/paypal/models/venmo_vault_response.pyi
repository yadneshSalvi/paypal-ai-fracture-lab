from __future__ import annotations
from typing_extensions import NotRequired, TypedDict
from ..core import UNSET, Optional, SdkBaseModel
from .customer_information import CustomerInformation, CustomerInformationDict
from .enums.venmo_vault_response_status import VenmoVaultResponseStatusOrStr
from .link_description import LinkDescription, LinkDescriptionDict

class VenmoVaultResponse(SdkBaseModel):
    id: Optional[str] = UNSET
    status: Optional[VenmoVaultResponseStatusOrStr] = UNSET
    links: Optional[list[LinkDescription]] = UNSET
    customer: Optional[CustomerInformation] = UNSET

class VenmoVaultResponseDict(TypedDict):
    id: NotRequired[str]
    status: NotRequired[VenmoVaultResponseStatusOrStr]
    links: NotRequired[list[LinkDescriptionDict]]
    customer: NotRequired[CustomerInformationDict]
