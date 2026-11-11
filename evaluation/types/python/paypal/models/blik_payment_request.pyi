from __future__ import annotations
from typing_extensions import NotRequired, TypedDict
from ..core import UNSET, Optional, SdkBaseModel
from .blik_experience_context import BlikExperienceContext, BlikExperienceContextDict
from .blik_level0_payment_object import BlikLevel0PaymentObject, BlikLevel0PaymentObjectDict
from .blik_one_click_payment_request import BlikOneClickPaymentRequest, BlikOneClickPaymentRequestDict

class BlikPaymentRequest(SdkBaseModel):
    name: str
    country_code: str
    email: Optional[str] = UNSET
    experience_context: Optional[BlikExperienceContext] = UNSET
    level_0: Optional[BlikLevel0PaymentObject] = UNSET
    one_click: Optional[BlikOneClickPaymentRequest] = UNSET

class BlikPaymentRequestDict(TypedDict):
    name: str
    country_code: str
    email: NotRequired[str]
    experience_context: NotRequired[BlikExperienceContextDict]
    level_0: NotRequired[BlikLevel0PaymentObjectDict]
    one_click: NotRequired[BlikOneClickPaymentRequestDict]
