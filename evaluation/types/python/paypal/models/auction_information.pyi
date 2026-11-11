from __future__ import annotations
from typing_extensions import NotRequired, TypedDict
from ..core import UNSET, Optional, SdkBaseModel

class AuctionInformation(SdkBaseModel):
    auction_site: Optional[str] = UNSET
    auction_item_site: Optional[str] = UNSET
    auction_buyer_id: Optional[str] = UNSET
    auction_closing_date: Optional[str] = UNSET

class AuctionInformationDict(TypedDict):
    auction_site: NotRequired[str]
    auction_item_site: NotRequired[str]
    auction_buyer_id: NotRequired[str]
    auction_closing_date: NotRequired[str]
