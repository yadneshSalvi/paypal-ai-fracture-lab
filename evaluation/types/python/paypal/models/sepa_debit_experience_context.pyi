from __future__ import annotations
from typing_extensions import NotRequired, TypedDict
from ..core import UNSET, Optional, SdkBaseModel

class SepaDebitExperienceContext(SdkBaseModel):
    locale: Optional[str] = UNSET
    return_url: str
    cancel_url: str

class SepaDebitExperienceContextDict(TypedDict):
    locale: NotRequired[str]
    return_url: str
    cancel_url: str
