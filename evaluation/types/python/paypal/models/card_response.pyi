from __future__ import annotations
from pydantic import Field
from typing_extensions import NotRequired, TypedDict
from ..core import UNSET, Optional, SdkBaseModel
from .authentication_response import AuthenticationResponse, AuthenticationResponseDict
from .bin_details import BinDetails, BinDetailsDict
from .card_attributes_response import CardAttributesResponse, CardAttributesResponseDict
from .card_from_request import CardFromRequest, CardFromRequestDict
from .card_stored_credential import CardStoredCredential, CardStoredCredentialDict
from .enums.card_brand import CardBrandOrStr
from .enums.card_type import CardTypeOrStr

class CardResponse(SdkBaseModel):
    name: Optional[str] = UNSET
    last_digits: Optional[str] = UNSET
    brand: Optional[CardBrandOrStr] = UNSET
    available_networks: Optional[list[CardBrandOrStr]] = UNSET
    type_: Optional[CardTypeOrStr] = Field(default=UNSET, alias='type')
    authentication_result: Optional[AuthenticationResponse] = UNSET
    attributes: Optional[CardAttributesResponse] = UNSET
    from_request: Optional[CardFromRequest] = UNSET
    expiry: Optional[str] = UNSET
    bin_details: Optional[BinDetails] = UNSET
    stored_credential: Optional[CardStoredCredential] = UNSET

class CardResponseDict(TypedDict):
    name: NotRequired[str]
    last_digits: NotRequired[str]
    brand: NotRequired[CardBrandOrStr]
    available_networks: NotRequired[list[CardBrandOrStr]]
    type_: NotRequired[CardTypeOrStr]
    authentication_result: NotRequired[AuthenticationResponseDict]
    attributes: NotRequired[CardAttributesResponseDict]
    from_request: NotRequired[CardFromRequestDict]
    expiry: NotRequired[str]
    bin_details: NotRequired[BinDetailsDict]
    stored_credential: NotRequired[CardStoredCredentialDict]
