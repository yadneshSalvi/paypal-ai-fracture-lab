from __future__ import annotations
from pydantic import Field
from typing_extensions import TypedDict
from ..core import SdkBaseModel
from .enums.upc_type import UpcTypeOrStr

class UniversalProductCode(SdkBaseModel):
    type_: UpcTypeOrStr = Field(alias='type')
    code: str

class UniversalProductCodeDict(TypedDict):
    type_: UpcTypeOrStr
    code: str
