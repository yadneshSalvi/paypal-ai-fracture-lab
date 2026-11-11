from __future__ import annotations
from dataclasses import dataclass
from typing import Final, TypeAlias
from ..core import ErrorMapper, RawError, decode_json
from ..models.error import Error
PatchOrderErrorBody: TypeAlias = Error | RawError

@dataclass(frozen=True, slots=True)
class _PatchOrderError:

    def map(self, status_code: int, content: bytes) -> PatchOrderErrorBody:
        ...
patch_order_error_mapper: Final[ErrorMapper[PatchOrderErrorBody]] = _PatchOrderError()
