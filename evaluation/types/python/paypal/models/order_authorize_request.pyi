from __future__ import annotations
from typing_extensions import NotRequired, TypedDict
from ..core import UNSET, Optional, SdkBaseModel
from .order_authorize_request_payment_source import OrderAuthorizeRequestPaymentSource, OrderAuthorizeRequestPaymentSourceDict

class OrderAuthorizeRequest(SdkBaseModel):
    payment_source: Optional[OrderAuthorizeRequestPaymentSource] = UNSET

class OrderAuthorizeRequestDict(TypedDict):
    payment_source: NotRequired[OrderAuthorizeRequestPaymentSourceDict]
