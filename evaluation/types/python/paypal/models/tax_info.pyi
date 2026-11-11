from __future__ import annotations
from typing_extensions import TypedDict
from ..core import SdkBaseModel
from .enums.tax_id_type import TaxIdTypeOrStr

class TaxInfo(SdkBaseModel):
    tax_id: str
    tax_id_type: TaxIdTypeOrStr

class TaxInfoDict(TypedDict):
    tax_id: str
    tax_id_type: TaxIdTypeOrStr
