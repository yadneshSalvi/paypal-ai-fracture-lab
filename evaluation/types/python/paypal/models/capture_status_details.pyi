from __future__ import annotations
from typing_extensions import NotRequired, TypedDict
from ..core import UNSET, Optional, SdkBaseModel
from .enums.capture_incomplete_reason import CaptureIncompleteReasonOrStr

class CaptureStatusDetails(SdkBaseModel):
    reason: Optional[CaptureIncompleteReasonOrStr] = UNSET

class CaptureStatusDetailsDict(TypedDict):
    reason: NotRequired[CaptureIncompleteReasonOrStr]
