from __future__ import annotations
from typing_extensions import NotRequired, TypedDict
from ..core import UNSET, Optional, SdkBaseModel
from .address import Address, AddressDict
from .enums.return_flow import ReturnFlow, ReturnFlowOrStr
from .name import Name, NameDict
from .phone_number import PhoneNumber, PhoneNumberDict
from .venmo_wallet_attributes_response import VenmoWalletAttributesResponse, VenmoWalletAttributesResponseDict

class VenmoWalletResponse(SdkBaseModel):
    email_address: Optional[str] = UNSET
    account_id: Optional[str] = UNSET
    user_name: Optional[str] = UNSET
    name: Optional[Name] = UNSET
    phone_number: Optional[PhoneNumber] = UNSET
    address: Optional[Address] = UNSET
    return_flow: ReturnFlowOrStr = ReturnFlow.AUTO
    attributes: Optional[VenmoWalletAttributesResponse] = UNSET

class VenmoWalletResponseDict(TypedDict):
    email_address: NotRequired[str]
    account_id: NotRequired[str]
    user_name: NotRequired[str]
    name: NotRequired[NameDict]
    phone_number: NotRequired[PhoneNumberDict]
    address: NotRequired[AddressDict]
    return_flow: NotRequired[ReturnFlowOrStr]
    attributes: NotRequired[VenmoWalletAttributesResponseDict]
