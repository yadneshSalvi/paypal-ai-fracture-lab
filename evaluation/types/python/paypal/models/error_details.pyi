from __future__ import annotations
from typing_extensions import NotRequired, TypedDict
from ..core import UNSET, Optional, SdkBaseModel
from .link_description import LinkDescription, LinkDescriptionDict

class ErrorDetails(SdkBaseModel):
    field: Optional[str] = UNSET
    value: Optional[str] = UNSET
    location: str = 'body'
    issue: str
    links: Optional[list[LinkDescription]] = UNSET
    description: Optional[str] = UNSET

class ErrorDetailsDict(TypedDict):
    field: NotRequired[str]
    value: NotRequired[str]
    location: NotRequired[str]
    issue: str
    links: NotRequired[list[LinkDescriptionDict]]
    description: NotRequired[str]
