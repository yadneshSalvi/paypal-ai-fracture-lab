from __future__ import annotations
from typing_extensions import NotRequired, TypedDict
from ..core import UNSET, Optional, SdkBaseModel
from .experience_context import ExperienceContext, ExperienceContextDict

class MyBankPaymentRequest(SdkBaseModel):
    name: str
    country_code: str
    experience_context: Optional[ExperienceContext] = UNSET

class MyBankPaymentRequestDict(TypedDict):
    name: str
    country_code: str
    experience_context: NotRequired[ExperienceContextDict]
