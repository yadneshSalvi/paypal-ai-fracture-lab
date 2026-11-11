from __future__ import annotations
from typing_extensions import TypedDict
from ..core import SdkBaseModel

class GooglePayExperienceContext(SdkBaseModel):
    return_url: str
    cancel_url: str

class GooglePayExperienceContextDict(TypedDict):
    return_url: str
    cancel_url: str
