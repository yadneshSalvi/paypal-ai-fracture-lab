from __future__ import annotations
from pydantic import Field
from typing_extensions import NotRequired, TypedDict
from ..core import UNSET, Optional, SdkBaseModel
from .bin_details import BinDetails, BinDetailsDict
from .card_authentication_response import CardAuthenticationResponse, CardAuthenticationResponseDict
from .card_response_address import CardResponseAddress, CardResponseAddressDict
from .card_verification_details import CardVerificationDetails, CardVerificationDetailsDict
from .enums.card_brand import CardBrandOrStr
from .enums.card_type import CardTypeOrStr
from .enums.card_verification_status import CardVerificationStatusOrStr
from .network_transaction_reference_entity import NetworkTransactionReferenceEntity, NetworkTransactionReferenceEntityDict

class SetupTokenResponseCard(SdkBaseModel):
    name: Optional[str] = UNSET
    last_digits: Optional[str] = UNSET
    brand: Optional[CardBrandOrStr] = UNSET
    expiry: Optional[str] = UNSET
    billing_address: Optional[CardResponseAddress] = UNSET
    verification_status: Optional[CardVerificationStatusOrStr] = UNSET
    verification: Optional[CardVerificationDetails] = UNSET
    network_transaction_reference: Optional[NetworkTransactionReferenceEntity] = UNSET
    authentication_result: Optional[CardAuthenticationResponse] = UNSET
    bin_details: Optional[BinDetails] = UNSET
    type_: Optional[CardTypeOrStr] = Field(default=UNSET, alias='type')

class SetupTokenResponseCardDict(TypedDict):
    name: NotRequired[str]
    last_digits: NotRequired[str]
    brand: NotRequired[CardBrandOrStr]
    expiry: NotRequired[str]
    billing_address: NotRequired[CardResponseAddressDict]
    verification_status: NotRequired[CardVerificationStatusOrStr]
    verification: NotRequired[CardVerificationDetailsDict]
    network_transaction_reference: NotRequired[NetworkTransactionReferenceEntityDict]
    authentication_result: NotRequired[CardAuthenticationResponseDict]
    bin_details: NotRequired[BinDetailsDict]
    type_: NotRequired[CardTypeOrStr]
