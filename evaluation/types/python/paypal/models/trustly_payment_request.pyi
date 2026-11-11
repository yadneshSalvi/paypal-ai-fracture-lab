from __future__ import annotations
from typing_extensions import NotRequired, TypedDict
from ..core import UNSET, Optional, SdkBaseModel
from .experience_context import ExperienceContext, ExperienceContextDict

class TrustlyPaymentRequest(SdkBaseModel):
    name: str
    country_code: str
    email: str
    experience_context: Optional[ExperienceContext] = UNSET

class TrustlyPaymentRequestDict(TypedDict):
    name: str
    country_code: str
    email: str
    experience_context: NotRequired[ExperienceContextDict]
