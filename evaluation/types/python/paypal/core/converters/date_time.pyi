from __future__ import annotations
import math
import re
from collections.abc import Callable
from dataclasses import dataclass
from datetime import date, datetime, timedelta, timezone
from email.utils import format_datetime, parsedate_to_datetime
from typing import Annotated, Final, Generic, TypeAlias, TypeVar
from pydantic.functional_serializers import PlainSerializer
from pydantic.functional_validators import BeforeValidator
T = TypeVar('T', bound=date)

@dataclass(frozen=True, slots=True)
class DateTimeConverter(Generic[T]):
    parse: Callable[[object], T]
    dump: Callable[[T], str | int]

def _require_tzaware(dt: datetime, *, name: str) -> datetime:
    ...
_SUBSECOND: Final = re.compile('\\.([0-9]+)')

def _parse_rfc3339(value: object) -> datetime:
    ...

def _dump_rfc3339(dt: datetime) -> str:
    ...
RFC3339: Final = DateTimeConverter(parse=_parse_rfc3339, dump=_dump_rfc3339)
RFC3339DateTime: TypeAlias = Annotated[datetime, BeforeValidator(RFC3339.parse), PlainSerializer(RFC3339.dump, return_type=str)]

def _parse_rfc1123(value: object) -> datetime:
    ...

def _dump_rfc1123(dt: datetime) -> str:
    ...
RFC1123: Final = DateTimeConverter(parse=_parse_rfc1123, dump=_dump_rfc1123)
RFC1123DateTime: TypeAlias = Annotated[datetime, BeforeValidator(RFC1123.parse), PlainSerializer(RFC1123.dump, return_type=str)]

def _parse_unix_seconds(value: object) -> datetime:
    ...

def _dump_unix_seconds(dt: datetime) -> int:
    ...
UNIX_SECONDS: Final = DateTimeConverter(parse=_parse_unix_seconds, dump=_dump_unix_seconds)
UnixSecondsDateTime: TypeAlias = Annotated[datetime, BeforeValidator(UNIX_SECONDS.parse), PlainSerializer(UNIX_SECONDS.dump, return_type=int)]

def _parse_date(value: object) -> date:
    ...

def _dump_date(value: date) -> str:
    ...
DATE: Final = DateTimeConverter(parse=_parse_date, dump=_dump_date)
Date: TypeAlias = Annotated[date, BeforeValidator(DATE.parse), PlainSerializer(DATE.dump, return_type=str)]
