from __future__ import annotations
from typing_extensions import NotRequired, TypedDict
from ..core import UNSET, Optional, SdkBaseModel
from .stored_payment_source import StoredPaymentSource, StoredPaymentSourceDict

class OrderConfirmApplicationContext(SdkBaseModel):
    brand_name: Optional[str] = UNSET
    locale: Optional[str] = UNSET
    return_url: Optional[str] = UNSET
    cancel_url: Optional[str] = UNSET
    stored_payment_source: Optional[StoredPaymentSource] = UNSET

class OrderConfirmApplicationContextDict(TypedDict):
    brand_name: NotRequired[str]
    locale: NotRequired[str]
    return_url: NotRequired[str]
    cancel_url: NotRequired[str]
    stored_payment_source: NotRequired[StoredPaymentSourceDict]
