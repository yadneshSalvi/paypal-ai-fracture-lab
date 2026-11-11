from __future__ import annotations
from dataclasses import dataclass
from typing import Final, TypeAlias
from ..core import ErrorMapper, RawError, decode_json
from ..models.subscription_error import SubscriptionError
ListSubscriptionTransactionsErrorBody: TypeAlias = SubscriptionError | RawError

@dataclass(frozen=True, slots=True)
class _ListSubscriptionTransactionsError:

    def map(self, status_code: int, content: bytes) -> ListSubscriptionTransactionsErrorBody:
        ...
list_subscription_transactions_error_mapper: Final[ErrorMapper[ListSubscriptionTransactionsErrorBody]] = _ListSubscriptionTransactionsError()
