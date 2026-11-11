from __future__ import annotations
from typing_extensions import NotRequired, TypedDict
from ..core import UNSET, Optional, SdkBaseModel
from .enums.eci_flag import EciFlagOrStr

class NetworkToken(SdkBaseModel):
    number: str
    expiry: str
    cryptogram: Optional[str] = UNSET
    eci_flag: Optional[EciFlagOrStr] = UNSET
    token_requestor_id: Optional[str] = UNSET

class NetworkTokenDict(TypedDict):
    number: str
    expiry: str
    cryptogram: NotRequired[str]
    eci_flag: NotRequired[EciFlagOrStr]
    token_requestor_id: NotRequired[str]
