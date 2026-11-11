from __future__ import annotations
from collections.abc import Mapping
from typing import Final, TypeAlias
from pydantic import BaseModel, ConfigDict, Field
from typing_extensions import NotRequired, TypedDict
from .retries import MaxRetries, RetryOptions

class RequestOptions(BaseModel):
    model_config = ConfigDict(frozen=True, extra='forbid')
    timeout: float | None = Field(default=None, gt=0)
    extra_headers: Mapping[str, str] | None = None
    max_retries: MaxRetries | None = None
    status_codes_to_retry: frozenset[int] | None = None

    @classmethod
    def coerce(cls, options: RequestOptionsOrDict | None) -> RequestOptions:
        ...

class RequestOptionsDict(TypedDict):
    timeout: NotRequired[float | None]
    extra_headers: NotRequired[Mapping[str, str] | None]
    max_retries: NotRequired[int | None]
    status_codes_to_retry: NotRequired[frozenset[int] | None]
RequestOptionsOrDict: TypeAlias = RequestOptions | RequestOptionsDict
_NO_OPTIONS: Final = RequestOptions()

def apply_retry_overrides(options: RequestOptions, retry_options: RetryOptions) -> RetryOptions:
    ...
