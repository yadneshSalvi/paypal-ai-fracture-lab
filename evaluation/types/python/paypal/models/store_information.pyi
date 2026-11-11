from __future__ import annotations
from typing_extensions import NotRequired, TypedDict
from ..core import UNSET, Optional, SdkBaseModel

class StoreInformation(SdkBaseModel):
    store_id: Optional[str] = UNSET
    terminal_id: Optional[str] = UNSET

class StoreInformationDict(TypedDict):
    store_id: NotRequired[str]
    terminal_id: NotRequired[str]
