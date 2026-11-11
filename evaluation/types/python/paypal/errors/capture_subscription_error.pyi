from __future__ import annotations
from dataclasses import dataclass
from typing import Final, TypeAlias
from ..core import ErrorMapper, RawError, decode_json
from ..models.subscription_error import SubscriptionError
CaptureSubscriptionErrorBody: TypeAlias = SubscriptionError | RawError

@dataclass(frozen=True, slots=True)
class _CaptureSubscriptionError:

    def map(self, status_code: int, content: bytes) -> CaptureSubscriptionErrorBody:
        ...
capture_subscription_error_mapper: Final[ErrorMapper[CaptureSubscriptionErrorBody]] = _CaptureSubscriptionError()
