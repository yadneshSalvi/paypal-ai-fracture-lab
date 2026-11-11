from __future__ import annotations
from typing_extensions import NotRequired, TypedDict
from ..core import UNSET, Optional, SdkBaseModel
from .authorization_with_additional_data import AuthorizationWithAdditionalData, AuthorizationWithAdditionalDataDict
from .orders_capture import OrdersCapture, OrdersCaptureDict
from .refund import Refund, RefundDict

class PaymentCollection(SdkBaseModel):
    authorizations: Optional[list[AuthorizationWithAdditionalData]] = UNSET
    captures: Optional[list[OrdersCapture]] = UNSET
    refunds: Optional[list[Refund]] = UNSET

class PaymentCollectionDict(TypedDict):
    authorizations: NotRequired[list[AuthorizationWithAdditionalDataDict]]
    captures: NotRequired[list[OrdersCaptureDict]]
    refunds: NotRequired[list[RefundDict]]
