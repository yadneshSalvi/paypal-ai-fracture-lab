from __future__ import annotations
from dataclasses import dataclass
from typing import Final, TypeAlias
from ..core import ErrorMapper, RawError, decode_json
from ..models.subscription_error import SubscriptionError
ActivateSubscriptionErrorBody: TypeAlias = SubscriptionError | RawError

@dataclass(frozen=True, slots=True)
class _ActivateSubscriptionError:

    def map(self, status_code: int, content: bytes) -> ActivateSubscriptionErrorBody:
        ...
activate_subscription_error_mapper: Final[ErrorMapper[ActivateSubscriptionErrorBody]] = _ActivateSubscriptionError()
