from __future__ import annotations
from typing_extensions import NotRequired, TypedDict
from ..core import UNSET, Optional, SdkBaseModel
from .enums.order_tracker_status import OrderTrackerStatusOrStr
from .link_description import LinkDescription, LinkDescriptionDict
from .order_tracker_item import OrderTrackerItem, OrderTrackerItemDict

class OrderTrackerResponse(SdkBaseModel):
    id: Optional[str] = UNSET
    status: Optional[OrderTrackerStatusOrStr] = UNSET
    items: Optional[list[OrderTrackerItem]] = UNSET
    links: Optional[list[LinkDescription]] = UNSET
    create_time: Optional[str] = UNSET
    update_time: Optional[str] = UNSET

class OrderTrackerResponseDict(TypedDict):
    id: NotRequired[str]
    status: NotRequired[OrderTrackerStatusOrStr]
    items: NotRequired[list[OrderTrackerItemDict]]
    links: NotRequired[list[LinkDescriptionDict]]
    create_time: NotRequired[str]
    update_time: NotRequired[str]
