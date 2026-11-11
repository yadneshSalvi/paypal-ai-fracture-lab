from __future__ import annotations
from dataclasses import dataclass
from typing import Final, TypeAlias
from ..core import ErrorMapper, RawError, decode_json
from ..models.error import Error
CreateSetupTokenErrorBody: TypeAlias = Error | RawError

@dataclass(frozen=True, slots=True)
class _CreateSetupTokenError:

    def map(self, status_code: int, content: bytes) -> CreateSetupTokenErrorBody:
        ...
create_setup_token_error_mapper: Final[ErrorMapper[CreateSetupTokenErrorBody]] = _CreateSetupTokenError()
