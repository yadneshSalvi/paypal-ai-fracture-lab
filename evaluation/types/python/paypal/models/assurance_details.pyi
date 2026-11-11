from __future__ import annotations
from typing_extensions import NotRequired, TypedDict
from ..core import SdkBaseModel

class AssuranceDetails(SdkBaseModel):
    account_verified: bool = False
    card_holder_authenticated: bool = False

class AssuranceDetailsDict(TypedDict):
    account_verified: NotRequired[bool]
    card_holder_authenticated: NotRequired[bool]
