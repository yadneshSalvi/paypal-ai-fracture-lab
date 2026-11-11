from __future__ import annotations
from typing_extensions import NotRequired, TypedDict
from ..core import UNSET, Optional, SdkBaseModel
from .name import Name, NameDict

class VaultCustomer(SdkBaseModel):
    id: Optional[str] = UNSET
    name: Optional[Name] = UNSET

class VaultCustomerDict(TypedDict):
    id: NotRequired[str]
    name: NotRequired[NameDict]
