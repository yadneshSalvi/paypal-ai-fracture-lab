from __future__ import annotations
from typing_extensions import NotRequired, TypedDict
from ..core import UNSET, Optional, SdkBaseModel
from .link_description import LinkDescription, LinkDescriptionDict
from .transaction_details import TransactionDetails, TransactionDetailsDict

class SearchResponse(SdkBaseModel):
    transaction_details: Optional[list[TransactionDetails]] = UNSET
    account_number: Optional[str] = UNSET
    start_date: Optional[str] = UNSET
    end_date: Optional[str] = UNSET
    last_refreshed_datetime: Optional[str] = UNSET
    page: Optional[int] = UNSET
    total_items: Optional[int] = UNSET
    total_pages: Optional[int] = UNSET
    links: Optional[list[LinkDescription]] = UNSET

class SearchResponseDict(TypedDict):
    transaction_details: NotRequired[list[TransactionDetailsDict]]
    account_number: NotRequired[str]
    start_date: NotRequired[str]
    end_date: NotRequired[str]
    last_refreshed_datetime: NotRequired[str]
    page: NotRequired[int]
    total_items: NotRequired[int]
    total_pages: NotRequired[int]
    links: NotRequired[list[LinkDescriptionDict]]
