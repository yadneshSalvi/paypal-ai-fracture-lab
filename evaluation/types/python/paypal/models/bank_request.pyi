from __future__ import annotations
from typing import Any
from typing_extensions import NotRequired, TypedDict
from ..core import UNSET, Optional, SdkBaseModel
from .sepa_debit_request import SepaDebitRequest, SepaDebitRequestDict

class BankRequest(SdkBaseModel):
    ach_debit: Optional[Any] = UNSET
    sepa_debit: Optional[SepaDebitRequest] = UNSET

class BankRequestDict(TypedDict):
    ach_debit: NotRequired[Any]
    sepa_debit: NotRequired[SepaDebitRequestDict]
