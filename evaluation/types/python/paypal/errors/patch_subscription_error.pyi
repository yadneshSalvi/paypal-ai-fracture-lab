from __future__ import annotations
from dataclasses import dataclass
from typing import Final, TypeAlias
from ..core import ErrorMapper, RawError, decode_json
from ..models.subscription_error import SubscriptionError
PatchSubscriptionErrorBody: TypeAlias = SubscriptionError | RawError

@dataclass(frozen=True, slots=True)
class _PatchSubscriptionError:

    def map(self, status_code: int, content: bytes) -> PatchSubscriptionErrorBody:
        ...
patch_subscription_error_mapper: Final[ErrorMapper[PatchSubscriptionErrorBody]] = _PatchSubscriptionError()
