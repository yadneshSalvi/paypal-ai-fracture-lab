from __future__ import annotations
from typing_extensions import TypedDict
from ..core import SdkBaseModel

class ApplePayExperienceContext(SdkBaseModel):
    return_url: str
    cancel_url: str

class ApplePayExperienceContextDict(TypedDict):
    return_url: str
    cancel_url: str
