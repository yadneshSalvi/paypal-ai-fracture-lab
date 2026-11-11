from __future__ import annotations
from dataclasses import dataclass
from typing import Final, TypeAlias
from ..core import ErrorMapper, RawError, decode_json
from ..models.subscription_error import SubscriptionError
CreateBillingPlanErrorBody: TypeAlias = SubscriptionError | RawError

@dataclass(frozen=True, slots=True)
class _CreateBillingPlanError:

    def map(self, status_code: int, content: bytes) -> CreateBillingPlanErrorBody:
        ...
create_billing_plan_error_mapper: Final[ErrorMapper[CreateBillingPlanErrorBody]] = _CreateBillingPlanError()
