from __future__ import annotations
from pydantic import Field
from typing_extensions import TypedDict
from ..core import SdkBaseModel
from .enums.token_type import TokenTypeOrStr

class Token(SdkBaseModel):
    id: str
    type_: TokenTypeOrStr = Field(alias='type')

class TokenDict(TypedDict):
    id: str
    type_: TokenTypeOrStr
