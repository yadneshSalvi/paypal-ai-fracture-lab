from __future__ import annotations
from typing import Any
from pydantic import Field
from typing_extensions import NotRequired, TypedDict
from ..core import UNSET, Optional, SdkBaseModel
from .enums.patch_op import PatchOpOrStr

class Patch(SdkBaseModel):
    op: PatchOpOrStr
    path: Optional[str] = UNSET
    value: Optional[Any] = UNSET
    from_: Optional[str] = Field(default=UNSET, alias='from')

class PatchDict(TypedDict):
    op: PatchOpOrStr
    path: NotRequired[str]
    value: NotRequired[Any]
    from_: NotRequired[str]
