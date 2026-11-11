from __future__ import annotations
from typing_extensions import NotRequired, TypedDict
from ..core import UNSET, Optional, SdkBaseModel
from .mobile_web_context import MobileWebContext, MobileWebContextDict
from .native_app_context import NativeAppContext, NativeAppContextDict

class AppSwitchContext(SdkBaseModel):
    native_app: Optional[NativeAppContext] = UNSET
    mobile_web: Optional[MobileWebContext] = UNSET

class AppSwitchContextDict(TypedDict):
    native_app: NotRequired[NativeAppContextDict]
    mobile_web: NotRequired[MobileWebContextDict]
