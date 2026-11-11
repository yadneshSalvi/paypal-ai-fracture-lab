from __future__ import annotations
from dataclasses import dataclass, field
from ...params import param
from ..models import AuthParams

@dataclass(frozen=True, slots=True)
class BearerAuthScheme:
    token: str = field(repr=False)

    def apply(self) -> AuthParams:
        ...
