from __future__ import annotations
from typing_extensions import NotRequired, TypedDict
from ..core import UNSET, Optional, SdkBaseModel
from .related_identifiers import RelatedIdentifiers, RelatedIdentifiersDict

class PaymentSupplementaryData(SdkBaseModel):
    related_ids: Optional[RelatedIdentifiers] = UNSET

class PaymentSupplementaryDataDict(TypedDict):
    related_ids: NotRequired[RelatedIdentifiersDict]
