from __future__ import annotations
import re
from email.message import Message
from typing import Final
from urllib.parse import quote
_SEPARATORS: Final = re.compile('[\\\\/]')
_WINDOWS_ILLEGAL: Final = frozenset('<>:"|?*')
_WINDOWS_RESERVED: Final = frozenset({'CON', 'PRN', 'AUX', 'NUL'} | {f'COM{d}' for d in '123456789'} | {f'LPT{d}' for d in '123456789'})

def content_disposition_filename(header: str | None) -> str | None:
    ...

def _decode_extended(value: tuple[object, ...]) -> str | None:
    ...

def render_content_disposition(filename: str) -> str:
    ...

def safe_filename(filename: str) -> str:
    ...
