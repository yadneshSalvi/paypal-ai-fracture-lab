from __future__ import annotations
from typing_extensions import NotRequired, TypedDict
from ..core import UNSET, Optional, SdkBaseModel
from .payer_name import PayerName, PayerNameDict
from .phone import Phone, PhoneDict
from .simple_postal_address_coarse_grained import SimplePostalAddressCoarseGrained, SimplePostalAddressCoarseGrainedDict

class PayerInformation(SdkBaseModel):
    account_id: Optional[str] = UNSET
    email_address: Optional[str] = UNSET
    phone_number: Optional[Phone] = UNSET
    address_status: Optional[str] = UNSET
    payer_status: Optional[str] = UNSET
    payer_name: Optional[PayerName] = UNSET
    country_code: Optional[str] = UNSET
    address: Optional[SimplePostalAddressCoarseGrained] = UNSET

class PayerInformationDict(TypedDict):
    account_id: NotRequired[str]
    email_address: NotRequired[str]
    phone_number: NotRequired[PhoneDict]
    address_status: NotRequired[str]
    payer_status: NotRequired[str]
    payer_name: NotRequired[PayerNameDict]
    country_code: NotRequired[str]
    address: NotRequired[SimplePostalAddressCoarseGrainedDict]
