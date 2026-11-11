from __future__ import annotations
from typing_extensions import NotRequired, TypedDict
from ..core import UNSET, Optional, SdkBaseModel
from .authorization_status_details import AuthorizationStatusDetails, AuthorizationStatusDetailsDict
from .enums.authorization_status import AuthorizationStatusOrStr
from .link_description import LinkDescription, LinkDescriptionDict
from .money import Money, MoneyDict
from .network_transaction import NetworkTransaction, NetworkTransactionDict
from .seller_protection import SellerProtection, SellerProtectionDict

class Authorization(SdkBaseModel):
    status: Optional[AuthorizationStatusOrStr] = UNSET
    status_details: Optional[AuthorizationStatusDetails] = UNSET
    id: Optional[str] = UNSET
    amount: Optional[Money] = UNSET
    invoice_id: Optional[str] = UNSET
    custom_id: Optional[str] = UNSET
    network_transaction_reference: Optional[NetworkTransaction] = UNSET
    seller_protection: Optional[SellerProtection] = UNSET
    expiration_time: Optional[str] = UNSET
    links: Optional[list[LinkDescription]] = UNSET
    create_time: Optional[str] = UNSET
    update_time: Optional[str] = UNSET

class AuthorizationDict(TypedDict):
    status: NotRequired[AuthorizationStatusOrStr]
    status_details: NotRequired[AuthorizationStatusDetailsDict]
    id: NotRequired[str]
    amount: NotRequired[MoneyDict]
    invoice_id: NotRequired[str]
    custom_id: NotRequired[str]
    network_transaction_reference: NotRequired[NetworkTransactionDict]
    seller_protection: NotRequired[SellerProtectionDict]
    expiration_time: NotRequired[str]
    links: NotRequired[list[LinkDescriptionDict]]
    create_time: NotRequired[str]
    update_time: NotRequired[str]
