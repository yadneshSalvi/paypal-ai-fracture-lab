from __future__ import annotations
from pydantic import Field
from typing_extensions import NotRequired, TypedDict
from ..core import UNSET, Optional, SdkBaseModel
from .address import Address, AddressDict
from .enums.fulfillment_type import FulfillmentTypeOrStr
from .order_tracker_response import OrderTrackerResponse, OrderTrackerResponseDict
from .phone_number_with_optional_country_code import PhoneNumberWithOptionalCountryCode, PhoneNumberWithOptionalCountryCodeDict
from .shipping_name import ShippingName, ShippingNameDict
from .shipping_option import ShippingOption, ShippingOptionDict

class ShippingWithTrackingDetails(SdkBaseModel):
    trackers: Optional[list[OrderTrackerResponse]] = UNSET
    name: Optional[ShippingName] = UNSET
    email_address: Optional[str] = UNSET
    phone_number: Optional[PhoneNumberWithOptionalCountryCode] = UNSET
    type_: Optional[FulfillmentTypeOrStr] = Field(default=UNSET, alias='type')
    options: Optional[list[ShippingOption]] = UNSET
    address: Optional[Address] = UNSET

class ShippingWithTrackingDetailsDict(TypedDict):
    trackers: NotRequired[list[OrderTrackerResponseDict]]
    name: NotRequired[ShippingNameDict]
    email_address: NotRequired[str]
    phone_number: NotRequired[PhoneNumberWithOptionalCountryCodeDict]
    type_: NotRequired[FulfillmentTypeOrStr]
    options: NotRequired[list[ShippingOptionDict]]
    address: NotRequired[AddressDict]
