from __future__ import annotations
from dataclasses import dataclass
from typing import Final, TypeAlias
from ..core import ErrorMapper, RawError, decode_json
from ..models.default_error import DefaultError
SearchBalancesErrorBody: TypeAlias = DefaultError | RawError

@dataclass(frozen=True, slots=True)
class _SearchBalancesError:

    def map(self, status_code: int, content: bytes) -> SearchBalancesErrorBody:
        ...
search_balances_error_mapper: Final[ErrorMapper[SearchBalancesErrorBody]] = _SearchBalancesError()
