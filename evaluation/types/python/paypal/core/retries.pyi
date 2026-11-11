from __future__ import annotations
import random
from collections.abc import Mapping
from datetime import datetime, timezone
from email.utils import parsedate_to_datetime
from pathlib import Path
from typing import Annotated, TypeAlias
from pydantic import BaseModel, ConfigDict, Field
from typing_extensions import NotRequired, TypedDict
from ._internal.headers import find_header
from .bodies import BinaryBody, FormBody, JsonBody, MultipartBody, MultipartFile, RequestBody, TextBody
from .transport import HttpMethod
MaxRetries: TypeAlias = Annotated[int, Field(ge=0)]
InitialDelay: TypeAlias = Annotated[float, Field(gt=0)]
BackoffFactor: TypeAlias = Annotated[float, Field(ge=1)]
MaxDelay: TypeAlias = Annotated[float, Field(gt=0)]
MaxJitter: TypeAlias = Annotated[float, Field(ge=0)]

class RetryOptions(BaseModel):
    model_config = ConfigDict(frozen=True, extra='forbid')
    max_retries: MaxRetries = 3
    initial_delay: InitialDelay = 1.0
    backoff_factor: BackoffFactor = 2.0
    max_delay: MaxDelay = 60.0
    max_jitter: MaxJitter = 0.5
    status_codes_to_retry: frozenset[int] = frozenset({408, 429, 500, 502, 503, 504})
    http_methods_to_retry: frozenset[HttpMethod] = frozenset({'GET', 'HEAD', 'PUT', 'OPTIONS'})

    @classmethod
    def coerce(cls, retry: int | RetryOptionsOrDict | None) -> RetryOptions:
        ...

class RetryOptionsDict(TypedDict):
    max_retries: NotRequired[int]
    initial_delay: NotRequired[float]
    backoff_factor: NotRequired[float]
    max_delay: NotRequired[float]
    max_jitter: NotRequired[float]
    status_codes_to_retry: NotRequired[frozenset[int]]
    http_methods_to_retry: NotRequired[frozenset[HttpMethod]]
RetryOptionsOrDict: TypeAlias = RetryOptions | RetryOptionsDict

def backoff_seconds(retries_taken: int, retry_options: RetryOptions) -> float:
    ...

def is_retryable_body(body: RequestBody | None) -> bool:
    ...

def retry_after_seconds(headers: Mapping[str, str], now: datetime) -> float | None:
    ...
