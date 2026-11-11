from __future__ import annotations
from dataclasses import dataclass, field
from ...params import param
from ..models import AuthParams

@dataclass(frozen=True, slots=True)
class ApiKeyHeaderScheme:
    name: str
    value: str = field(repr=False)

    def apply(self) -> AuthParams:
        ...

@dataclass(frozen=True, slots=True)
class ApiKeyQueryScheme:
    name: str
    value: str = field(repr=False)

    def apply(self) -> AuthParams:
        ...

@dataclass(frozen=True, slots=True)
class ApiKeyCookieScheme:
    name: str
    value: str = field(repr=False)

    def apply(self) -> AuthParams:
        ...
