from __future__ import annotations
from dataclasses import dataclass
from typing import Final, TypeAlias
from ..core import ErrorMapper, RawError, decode_json
from ..models.subscription_error import SubscriptionError
DeactivateBillingPlanErrorBody: TypeAlias = SubscriptionError | RawError

@dataclass(frozen=True, slots=True)
class _DeactivateBillingPlanError:

    def map(self, status_code: int, content: bytes) -> DeactivateBillingPlanErrorBody:
        ...
deactivate_billing_plan_error_mapper: Final[ErrorMapper[DeactivateBillingPlanErrorBody]] = _DeactivateBillingPlanError()
