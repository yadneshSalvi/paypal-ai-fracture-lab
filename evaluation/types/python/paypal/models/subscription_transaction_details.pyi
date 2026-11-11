from __future__ import annotations
from typing_extensions import NotRequired, TypedDict
from ..core import UNSET, Optional, SdkBaseModel
from .enums.capture_status import CaptureStatusOrStr
from .subscription_amount_with_breakdown import SubscriptionAmountWithBreakdown, SubscriptionAmountWithBreakdownDict
from .subscription_payer_name import SubscriptionPayerName, SubscriptionPayerNameDict

class SubscriptionTransactionDetails(SdkBaseModel):
    status: Optional[CaptureStatusOrStr] = UNSET
    id: str
    amount_with_breakdown: SubscriptionAmountWithBreakdown
    payer_name: Optional[SubscriptionPayerName] = UNSET
    payer_email: Optional[str] = UNSET
    time: str

class SubscriptionTransactionDetailsDict(TypedDict):
    status: NotRequired[CaptureStatusOrStr]
    id: str
    amount_with_breakdown: SubscriptionAmountWithBreakdownDict
    payer_name: NotRequired[SubscriptionPayerNameDict]
    payer_email: NotRequired[str]
    time: str
