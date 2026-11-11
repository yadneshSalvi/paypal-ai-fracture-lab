from __future__ import annotations
from typing_extensions import NotRequired, TypedDict
from ..core import UNSET, Optional, SdkBaseModel

class SimplePostalAddressCoarseGrained(SdkBaseModel):
    line1: str
    line2: Optional[str] = UNSET
    city: str
    state: Optional[str] = UNSET
    country_code: str
    postal_code: Optional[str] = UNSET

class SimplePostalAddressCoarseGrainedDict(TypedDict):
    line1: str
    line2: NotRequired[str]
    city: str
    state: NotRequired[str]
    country_code: str
    postal_code: NotRequired[str]
