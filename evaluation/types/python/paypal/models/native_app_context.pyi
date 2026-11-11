from __future__ import annotations
from typing_extensions import NotRequired, TypedDict
from ..core import UNSET, Optional, SdkBaseModel
from .enums.os_type import OsTypeOrStr

class NativeAppContext(SdkBaseModel):
    os_type: Optional[OsTypeOrStr] = UNSET
    os_version: Optional[str] = UNSET

class NativeAppContextDict(TypedDict):
    os_type: NotRequired[OsTypeOrStr]
    os_version: NotRequired[str]
