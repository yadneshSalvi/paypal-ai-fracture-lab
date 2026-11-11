from __future__ import annotations
from typing import Generic
from .core import RawClientT, RetryOptions, RetryOptionsOrDict
from .server.server import Server
from .server.server_config import ServerConfig
DEFAULT_TIMEOUT = 30.0

class BasePaypalClient(Generic[RawClientT]):
    _raw_client: RawClientT

    def __init__(self, *, base_url: str | None=None, timeout: float=DEFAULT_TIMEOUT, retry_options: int | RetryOptionsOrDict | None=None) -> None:
        ...
