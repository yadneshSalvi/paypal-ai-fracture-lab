from __future__ import annotations
from typing_extensions import NotRequired, TypedDict
from ..core import UNSET, Optional, SdkBaseModel
from .error_details import ErrorDetails, ErrorDetailsDict
from .link_description import LinkDescription, LinkDescriptionDict

class Error(SdkBaseModel):
    name: str
    message: str
    debug_id: str
    details: Optional[list[ErrorDetails]] = UNSET
    links: Optional[list[LinkDescription]] = UNSET

class ErrorDict(TypedDict):
    name: str
    message: str
    debug_id: str
    details: NotRequired[list[ErrorDetailsDict]]
    links: NotRequired[list[LinkDescriptionDict]]
