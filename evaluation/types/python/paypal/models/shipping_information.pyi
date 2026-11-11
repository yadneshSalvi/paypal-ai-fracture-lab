from __future__ import annotations
from typing_extensions import NotRequired, TypedDict
from ..core import UNSET, Optional, SdkBaseModel
from .simple_postal_address_coarse_grained import SimplePostalAddressCoarseGrained, SimplePostalAddressCoarseGrainedDict

class ShippingInformation(SdkBaseModel):
    name: Optional[str] = UNSET
    method: Optional[str] = UNSET
    address: Optional[SimplePostalAddressCoarseGrained] = UNSET
    secondary_shipping_address: Optional[SimplePostalAddressCoarseGrained] = UNSET

class ShippingInformationDict(TypedDict):
    name: NotRequired[str]
    method: NotRequired[str]
    address: NotRequired[SimplePostalAddressCoarseGrainedDict]
    secondary_shipping_address: NotRequired[SimplePostalAddressCoarseGrainedDict]
