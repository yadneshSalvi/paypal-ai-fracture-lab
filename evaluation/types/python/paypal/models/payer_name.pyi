from __future__ import annotations
from typing_extensions import NotRequired, TypedDict
from ..core import UNSET, Optional, SdkBaseModel

class PayerName(SdkBaseModel):
    prefix: Optional[str] = UNSET
    given_name: Optional[str] = UNSET
    surname: Optional[str] = UNSET
    middle_name: Optional[str] = UNSET
    suffix: Optional[str] = UNSET
    alternate_full_name: Optional[str] = UNSET
    full_name: Optional[str] = UNSET

class PayerNameDict(TypedDict):
    prefix: NotRequired[str]
    given_name: NotRequired[str]
    surname: NotRequired[str]
    middle_name: NotRequired[str]
    suffix: NotRequired[str]
    alternate_full_name: NotRequired[str]
    full_name: NotRequired[str]
