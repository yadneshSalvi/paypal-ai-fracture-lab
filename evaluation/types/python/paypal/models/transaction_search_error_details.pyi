from __future__ import annotations
from typing_extensions import NotRequired, TypedDict
from ..core import UNSET, Optional, SdkBaseModel

class TransactionSearchErrorDetails(SdkBaseModel):
    field: Optional[str] = UNSET
    value: Optional[str] = UNSET
    location: str = 'body'
    issue: str
    description: Optional[str] = UNSET

class TransactionSearchErrorDetailsDict(TypedDict):
    field: NotRequired[str]
    value: NotRequired[str]
    location: NotRequired[str]
    issue: str
    description: NotRequired[str]
