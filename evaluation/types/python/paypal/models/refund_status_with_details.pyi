from __future__ import annotations
from typing_extensions import NotRequired, TypedDict
from ..core import UNSET, Optional, SdkBaseModel
from .enums.refund_status import RefundStatusOrStr
from .refund_status_details import RefundStatusDetails, RefundStatusDetailsDict

class RefundStatusWithDetails(SdkBaseModel):
    status: Optional[RefundStatusOrStr] = UNSET
    status_details: Optional[RefundStatusDetails] = UNSET

class RefundStatusWithDetailsDict(TypedDict):
    status: NotRequired[RefundStatusOrStr]
    status_details: NotRequired[RefundStatusDetailsDict]
