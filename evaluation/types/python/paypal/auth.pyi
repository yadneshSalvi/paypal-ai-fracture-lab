from __future__ import annotations
from dataclasses import dataclass
from .core import AsyncAuthScheme, AuthScheme

@dataclass(frozen=True, slots=True, kw_only=True)
class AuthSchemes:
    oauth2: AuthScheme

@dataclass(frozen=True, slots=True, kw_only=True)
class AsyncAuthSchemes:
    oauth2: AsyncAuthScheme
