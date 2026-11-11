from __future__ import annotations
from typing_extensions import NotRequired, TypedDict
from ..core import UNSET, Optional, SdkBaseModel

class CheckoutOption(SdkBaseModel):
    checkout_option_name: Optional[str] = UNSET
    checkout_option_value: Optional[str] = UNSET

class CheckoutOptionDict(TypedDict):
    checkout_option_name: NotRequired[str]
    checkout_option_value: NotRequired[str]
