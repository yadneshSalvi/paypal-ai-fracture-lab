from __future__ import annotations
from typing_extensions import NotRequired, TypedDict
from ..core import UNSET, Optional, SdkBaseModel
from .enums.refund_incomplete_reason import RefundIncompleteReasonOrStr

class RefundStatusDetails(SdkBaseModel):
    reason: Optional[RefundIncompleteReasonOrStr] = UNSET

class RefundStatusDetailsDict(TypedDict):
    reason: NotRequired[RefundIncompleteReasonOrStr]
