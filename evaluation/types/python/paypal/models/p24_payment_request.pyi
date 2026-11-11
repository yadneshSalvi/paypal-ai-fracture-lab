from __future__ import annotations
from typing_extensions import NotRequired, TypedDict
from ..core import UNSET, Optional, SdkBaseModel
from .experience_context import ExperienceContext, ExperienceContextDict

class P24PaymentRequest(SdkBaseModel):
    name: str
    email: str
    country_code: str
    experience_context: Optional[ExperienceContext] = UNSET

class P24PaymentRequestDict(TypedDict):
    name: str
    email: str
    country_code: str
    experience_context: NotRequired[ExperienceContextDict]
