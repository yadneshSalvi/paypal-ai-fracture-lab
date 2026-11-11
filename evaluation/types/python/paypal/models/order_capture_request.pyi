from __future__ import annotations
from typing_extensions import NotRequired, TypedDict
from ..core import UNSET, Optional, SdkBaseModel
from .order_capture_request_payment_source import OrderCaptureRequestPaymentSource, OrderCaptureRequestPaymentSourceDict

class OrderCaptureRequest(SdkBaseModel):
    payment_source: Optional[OrderCaptureRequestPaymentSource] = UNSET

class OrderCaptureRequestDict(TypedDict):
    payment_source: NotRequired[OrderCaptureRequestPaymentSourceDict]
