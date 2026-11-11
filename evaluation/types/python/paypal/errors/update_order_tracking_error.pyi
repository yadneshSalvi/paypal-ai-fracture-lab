from __future__ import annotations
from dataclasses import dataclass
from typing import Final, TypeAlias
from ..core import ErrorMapper, RawError, decode_json
from ..models.error import Error
UpdateOrderTrackingErrorBody: TypeAlias = Error | RawError

@dataclass(frozen=True, slots=True)
class _UpdateOrderTrackingError:

    def map(self, status_code: int, content: bytes) -> UpdateOrderTrackingErrorBody:
        ...
update_order_tracking_error_mapper: Final[ErrorMapper[UpdateOrderTrackingErrorBody]] = _UpdateOrderTrackingError()
