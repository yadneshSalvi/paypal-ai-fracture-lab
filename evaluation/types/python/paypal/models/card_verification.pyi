from __future__ import annotations
from typing_extensions import NotRequired, TypedDict
from ..core import SdkBaseModel
from .enums.orders_card_verification_method import OrdersCardVerificationMethod, OrdersCardVerificationMethodOrStr

class CardVerification(SdkBaseModel):
    method: OrdersCardVerificationMethodOrStr = OrdersCardVerificationMethod.SCA_WHEN_REQUIRED

class CardVerificationDict(TypedDict):
    method: NotRequired[OrdersCardVerificationMethodOrStr]
