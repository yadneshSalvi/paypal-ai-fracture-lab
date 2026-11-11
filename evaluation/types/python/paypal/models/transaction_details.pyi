from __future__ import annotations
from typing_extensions import NotRequired, TypedDict
from ..core import UNSET, Optional, SdkBaseModel
from .auction_information import AuctionInformation, AuctionInformationDict
from .cart_information import CartInformation, CartInformationDict
from .incentive_information import IncentiveInformation, IncentiveInformationDict
from .payer_information import PayerInformation, PayerInformationDict
from .shipping_information import ShippingInformation, ShippingInformationDict
from .store_information import StoreInformation, StoreInformationDict
from .transaction_information import TransactionInformation, TransactionInformationDict

class TransactionDetails(SdkBaseModel):
    transaction_info: Optional[TransactionInformation] = UNSET
    payer_info: Optional[PayerInformation] = UNSET
    shipping_info: Optional[ShippingInformation] = UNSET
    cart_info: Optional[CartInformation] = UNSET
    store_info: Optional[StoreInformation] = UNSET
    auction_info: Optional[AuctionInformation] = UNSET
    incentive_info: Optional[IncentiveInformation] = UNSET

class TransactionDetailsDict(TypedDict):
    transaction_info: NotRequired[TransactionInformationDict]
    payer_info: NotRequired[PayerInformationDict]
    shipping_info: NotRequired[ShippingInformationDict]
    cart_info: NotRequired[CartInformationDict]
    store_info: NotRequired[StoreInformationDict]
    auction_info: NotRequired[AuctionInformationDict]
    incentive_info: NotRequired[IncentiveInformationDict]
