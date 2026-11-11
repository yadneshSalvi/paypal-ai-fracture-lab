from __future__ import annotations
from dataclasses import dataclass
from typing import Final
from .models import AuthParams
from .protocols import AsyncAuthScheme, AuthScheme, RevocableAuthScheme

async def resolve_auth(scheme: AsyncAuthScheme) -> AuthParams:
    ...

@dataclass(frozen=True, slots=True)
class _NoAuth:

    def apply(self) -> AuthParams:
        ...
no_auth: Final[AuthScheme] = _NoAuth()

def is_configured(scheme: AuthScheme | AsyncAuthScheme) -> bool:
    ...

def invalidate(scheme: AuthScheme | AsyncAuthScheme) -> None:
    ...

class AllSchemes:
    __slots__ = ('_schemes',)

    def __init__(self, *schemes: AuthScheme) -> None:
        ...

    def apply(self) -> AuthParams:
        ...

    def invalidate(self) -> None:
        ...

class AnySchemes:
    __slots__ = ('_schemes',)

    def __init__(self, *schemes: AuthScheme) -> None:
        ...

    def apply(self) -> AuthParams:
        ...

    def invalidate(self) -> None:
        ...

class AsyncAllSchemes:
    __slots__ = ('_schemes',)

    def __init__(self, *schemes: AsyncAuthScheme) -> None:
        ...

    async def apply(self) -> AuthParams:
        ...

    def invalidate(self) -> None:
        ...

class AsyncAnySchemes:
    __slots__ = ('_schemes',)

    def __init__(self, *schemes: AsyncAuthScheme) -> None:
        ...

    async def apply(self) -> AuthParams:
        ...

    def invalidate(self) -> None:
        ...
