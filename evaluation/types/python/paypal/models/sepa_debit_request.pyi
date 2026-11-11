from __future__ import annotations
from typing_extensions import NotRequired, TypedDict
from ..core import UNSET, Optional, SdkBaseModel
from .sepa_debit_experience_context import SepaDebitExperienceContext, SepaDebitExperienceContextDict

class SepaDebitRequest(SdkBaseModel):
    experience_context: Optional[SepaDebitExperienceContext] = UNSET

class SepaDebitRequestDict(TypedDict):
    experience_context: NotRequired[SepaDebitExperienceContextDict]
