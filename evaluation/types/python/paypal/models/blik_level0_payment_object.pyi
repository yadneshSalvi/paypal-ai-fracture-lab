from __future__ import annotations
from typing_extensions import TypedDict
from ..core import SdkBaseModel

class BlikLevel0PaymentObject(SdkBaseModel):
    auth_code: str

class BlikLevel0PaymentObjectDict(TypedDict):
    auth_code: str
