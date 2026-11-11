from __future__ import annotations
from dataclasses import dataclass
from typing import Final, TypeAlias
from ..core import ErrorMapper, RawError, decode_json
from ..models.subscription_error import SubscriptionError
UpdateBillingPlanPricingSchemesErrorBody: TypeAlias = SubscriptionError | RawError

@dataclass(frozen=True, slots=True)
class _UpdateBillingPlanPricingSchemesError:

    def map(self, status_code: int, content: bytes) -> UpdateBillingPlanPricingSchemesErrorBody:
        ...
update_billing_plan_pricing_schemes_error_mapper: Final[ErrorMapper[UpdateBillingPlanPricingSchemesErrorBody]] = _UpdateBillingPlanPricingSchemesError()
