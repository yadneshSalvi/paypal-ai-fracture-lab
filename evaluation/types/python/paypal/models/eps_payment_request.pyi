from __future__ import annotations
from typing_extensions import NotRequired, TypedDict
from ..core import UNSET, Optional, SdkBaseModel
from .experience_context import ExperienceContext, ExperienceContextDict

class EpsPaymentRequest(SdkBaseModel):
    name: str
    country_code: str
    experience_context: Optional[ExperienceContext] = UNSET

class EpsPaymentRequestDict(TypedDict):
    name: str
    country_code: str
    experience_context: NotRequired[ExperienceContextDict]
