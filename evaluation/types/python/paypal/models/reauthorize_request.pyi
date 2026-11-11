from __future__ import annotations
from typing_extensions import NotRequired, TypedDict
from ..core import UNSET, Optional, SdkBaseModel
from .money import Money, MoneyDict

class ReauthorizeRequest(SdkBaseModel):
    amount: Optional[Money] = UNSET

class ReauthorizeRequestDict(TypedDict):
    amount: NotRequired[MoneyDict]
