from __future__ import annotations
from typing_extensions import NotRequired, TypedDict
from ..core import UNSET, Optional, SdkBaseModel
from .enums.shipment_carrier import ShipmentCarrierOrStr
from .order_tracker_item import OrderTrackerItem, OrderTrackerItemDict

class OrderTrackerRequest(SdkBaseModel):
    tracking_number: Optional[str] = UNSET
    carrier: Optional[ShipmentCarrierOrStr] = UNSET
    carrier_name_other: Optional[str] = UNSET
    capture_id: str
    notify_payer: bool = False
    items: Optional[list[OrderTrackerItem]] = UNSET

class OrderTrackerRequestDict(TypedDict):
    tracking_number: NotRequired[str]
    carrier: NotRequired[ShipmentCarrierOrStr]
    carrier_name_other: NotRequired[str]
    capture_id: str
    notify_payer: NotRequired[bool]
    items: NotRequired[list[OrderTrackerItemDict]]
