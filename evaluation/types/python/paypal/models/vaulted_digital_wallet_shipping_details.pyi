from __future__ import annotations
from pydantic import Field
from typing_extensions import NotRequired, TypedDict
from ..core import UNSET, Optional, SdkBaseModel
from .address import Address, AddressDict
from .enums.fulfillment_type import FulfillmentTypeOrStr
from .phone_number_with_country_code import PhoneNumberWithCountryCode, PhoneNumberWithCountryCodeDict
from .shipping_name import ShippingName, ShippingNameDict

class VaultedDigitalWalletShippingDetails(SdkBaseModel):
    name: Optional[ShippingName] = UNSET
    email_address: Optional[str] = UNSET
    phone_number: Optional[PhoneNumberWithCountryCode] = UNSET
    type_: Optional[FulfillmentTypeOrStr] = Field(default=UNSET, alias='type')
    address: Optional[Address] = UNSET

class VaultedDigitalWalletShippingDetailsDict(TypedDict):
    name: NotRequired[ShippingNameDict]
    email_address: NotRequired[str]
    phone_number: NotRequired[PhoneNumberWithCountryCodeDict]
    type_: NotRequired[FulfillmentTypeOrStr]
    address: NotRequired[AddressDict]
