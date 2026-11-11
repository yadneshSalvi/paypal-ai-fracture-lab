from __future__ import annotations
from typing_extensions import TypedDict
from ..core import SdkBaseModel
from .enums.callback_events import CallbackEventsOrStr

class CallbackConfiguration(SdkBaseModel):
    callback_events: list[CallbackEventsOrStr]
    callback_url: str

class CallbackConfigurationDict(TypedDict):
    callback_events: list[CallbackEventsOrStr]
    callback_url: str
