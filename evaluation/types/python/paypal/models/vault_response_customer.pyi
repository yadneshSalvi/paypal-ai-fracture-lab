from __future__ import annotations
from typing import Any
from typing_extensions import NotRequired, TypedDict
from ..core import UNSET, Optional, SdkBaseModel

class VaultResponseCustomer(SdkBaseModel):
    id: Optional[str] = UNSET
    merchant_customer_id: Optional[str] = UNSET
    links: Optional[list[Any]] = UNSET

class VaultResponseCustomerDict(TypedDict):
    id: NotRequired[str]
    merchant_customer_id: NotRequired[str]
    links: NotRequired[list[Any]]
