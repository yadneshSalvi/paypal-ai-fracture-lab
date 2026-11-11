from __future__ import annotations
from typing_extensions import NotRequired, TypedDict
from ..core import UNSET, Optional, SdkBaseModel
from .balance_information import BalanceInformation, BalanceInformationDict

class BalancesResponse(SdkBaseModel):
    balances: Optional[list[BalanceInformation]] = UNSET
    account_id: Optional[str] = UNSET
    as_of_time: Optional[str] = UNSET
    last_refresh_time: Optional[str] = UNSET

class BalancesResponseDict(TypedDict):
    balances: NotRequired[list[BalanceInformationDict]]
    account_id: NotRequired[str]
    as_of_time: NotRequired[str]
    last_refresh_time: NotRequired[str]
