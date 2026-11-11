from __future__ import annotations
from typing_extensions import NotRequired, TypedDict
from ..core import UNSET, Optional, SdkBaseModel
from .experience_context import ExperienceContext, ExperienceContextDict

class IDealPaymentRequest(SdkBaseModel):
    name: str
    country_code: str
    bic: Optional[str] = UNSET
    experience_context: Optional[ExperienceContext] = UNSET

class IDealPaymentRequestDict(TypedDict):
    name: str
    country_code: str
    bic: NotRequired[str]
    experience_context: NotRequired[ExperienceContextDict]
