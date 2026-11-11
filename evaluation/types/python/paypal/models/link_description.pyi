from __future__ import annotations
from typing_extensions import NotRequired, TypedDict
from ..core import UNSET, Optional, SdkBaseModel
from .enums.link_http_method import LinkHttpMethodOrStr

class LinkDescription(SdkBaseModel):
    href: str
    rel: str
    method: Optional[LinkHttpMethodOrStr] = UNSET

class LinkDescriptionDict(TypedDict):
    href: str
    rel: str
    method: NotRequired[LinkHttpMethodOrStr]
