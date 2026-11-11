from __future__ import annotations
from dataclasses import dataclass
from typing import Final, TypeAlias
from ..core import ErrorMapper, RawError, decode_json
from ..models.subscription_error import SubscriptionError
CreateSubscriptionErrorBody: TypeAlias = SubscriptionError | RawError

@dataclass(frozen=True, slots=True)
class _CreateSubscriptionError:

    def map(self, status_code: int, content: bytes) -> CreateSubscriptionErrorBody:
        ...
create_subscription_error_mapper: Final[ErrorMapper[CreateSubscriptionErrorBody]] = _CreateSubscriptionError()
