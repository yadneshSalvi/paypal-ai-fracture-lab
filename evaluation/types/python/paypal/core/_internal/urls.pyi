from __future__ import annotations
import re
from collections.abc import Mapping, Sequence
from typing import Any, Final
from urllib.parse import quote, urlencode
from ..params import Param, UrlTemplate
from .flattening import flatten
from .wire import text_values
_PLACEHOLDER: Final = re.compile('\\{([^{}]+)\\}')

def expand_template(template: str, segments: Mapping[str, tuple[str, ...]]) -> str:
    ...

def render_segments(params: Sequence[Param[Any]] | None) -> dict[str, tuple[str, ...]]:
    ...

def encode_query(params: Sequence[Param[Any]] | None) -> str:
    ...

def resolve_params(global_params: Sequence[Param[Any]], call_params: Sequence[Param[Any]] | None) -> tuple[Param[Any], ...]:
    ...

def build_url(url_template: UrlTemplate, *, path_params: Sequence[Param[Any]] | None=None, query_params: Sequence[Param[Any]] | None=None) -> str:
    ...

def strip_query(url: str) -> str:
    ...
