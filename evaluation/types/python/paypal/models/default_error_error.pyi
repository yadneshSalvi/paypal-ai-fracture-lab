from __future__ import annotations
from typing_extensions import NotRequired, TypedDict
from ..core import UNSET, Optional, SdkBaseModel
from .link_description import LinkDescription, LinkDescriptionDict
from .transaction_search_error_details import TransactionSearchErrorDetails, TransactionSearchErrorDetailsDict

class DefaultErrorError(SdkBaseModel):
    name: str
    message: str
    debug_id: str
    information_link: Optional[str] = UNSET
    details: Optional[list[TransactionSearchErrorDetails]] = UNSET
    links: Optional[list[LinkDescription]] = UNSET

class DefaultErrorErrorDict(TypedDict):
    name: str
    message: str
    debug_id: str
    information_link: NotRequired[str]
    details: NotRequired[list[TransactionSearchErrorDetailsDict]]
    links: NotRequired[list[LinkDescriptionDict]]
