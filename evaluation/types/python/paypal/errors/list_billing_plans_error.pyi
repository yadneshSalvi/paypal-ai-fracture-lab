from __future__ import annotations
from dataclasses import dataclass
from typing import Final, TypeAlias
from ..core import ErrorMapper, RawError, decode_json
from ..models.subscription_error import SubscriptionError
ListBillingPlansErrorBody: TypeAlias = SubscriptionError | RawError

@dataclass(frozen=True, slots=True)
class _ListBillingPlansError:

    def map(self, status_code: int, content: bytes) -> ListBillingPlansErrorBody:
        ...
list_billing_plans_error_mapper: Final[ErrorMapper[ListBillingPlansErrorBody]] = _ListBillingPlansError()
