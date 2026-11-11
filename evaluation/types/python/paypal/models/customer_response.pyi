from __future__ import annotations
from typing_extensions import NotRequired, TypedDict
from ..core import UNSET, Optional, SdkBaseModel

class CustomerResponse(SdkBaseModel):
    id: Optional[str] = UNSET
    merchant_customer_id: Optional[str] = UNSET

class CustomerResponseDict(TypedDict):
    id: NotRequired[str]
    merchant_customer_id: NotRequired[str]
