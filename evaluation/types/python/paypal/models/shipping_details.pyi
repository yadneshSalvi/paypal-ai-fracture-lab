from __future__ import annotations
from pydantic import Field
from typing_extensions import NotRequired, TypedDict
from ..core import UNSET, Optional, SdkBaseModel
from .address import Address, AddressDict
from .enums.fulfillment_type import FulfillmentTypeOrStr
from .phone_number_with_country_code import PhoneNumberWithCountryCode, PhoneNumberWithCountryCodeDict
from .shipping_name import ShippingName, ShippingNameDict
from .shipping_option import ShippingOption, ShippingOptionDict

class ShippingDetails(SdkBaseModel):
    name: Optional[ShippingName] = UNSET
    email_address: Optional[str] = UNSET
    phone_number: Optional[PhoneNumberWithCountryCode] = UNSET
    type_: Optional[FulfillmentTypeOrStr] = Field(default=UNSET, alias='type')
    options: Optional[list[ShippingOption]] = UNSET
    address: Optional[Address] = UNSET

class ShippingDetailsDict(TypedDict):
    name: NotRequired[ShippingNameDict]
    email_address: NotRequired[str]
    phone_number: NotRequired[PhoneNumberWithCountryCodeDict]
    type_: NotRequired[FulfillmentTypeOrStr]
    options: NotRequired[list[ShippingOptionDict]]
    address: NotRequired[AddressDict]
