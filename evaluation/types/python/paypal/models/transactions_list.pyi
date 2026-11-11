from __future__ import annotations
from typing_extensions import NotRequired, TypedDict
from ..core import UNSET, Optional, SdkBaseModel
from .link_description import LinkDescription, LinkDescriptionDict
from .subscription_transaction_details import SubscriptionTransactionDetails, SubscriptionTransactionDetailsDict

class TransactionsList(SdkBaseModel):
    transactions: Optional[list[SubscriptionTransactionDetails]] = UNSET
    total_items: Optional[int] = UNSET
    total_pages: Optional[int] = UNSET
    links: Optional[list[LinkDescription]] = UNSET

class TransactionsListDict(TypedDict):
    transactions: NotRequired[list[SubscriptionTransactionDetailsDict]]
    total_items: NotRequired[int]
    total_pages: NotRequired[int]
    links: NotRequired[list[LinkDescriptionDict]]
