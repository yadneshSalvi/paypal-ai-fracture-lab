from __future__ import annotations
from typing import Generic, TypeVar
from .raw_client import RawClientT
ServerT = TypeVar('ServerT')
AuthT = TypeVar('AuthT')

class BaseRawResponse(Generic[RawClientT, ServerT]):

    def __init__(self, client: RawClientT, server: ServerT) -> None:
        ...

class SecuredRawResponse(BaseRawResponse[RawClientT, ServerT], Generic[RawClientT, ServerT, AuthT]):

    def __init__(self, client: RawClientT, server: ServerT, auth: AuthT) -> None:
        ...
