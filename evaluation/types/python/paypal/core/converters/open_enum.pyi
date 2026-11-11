from __future__ import annotations
from enum import Enum
from pydantic import BeforeValidator

def open_enum_validator(enum_type: type[Enum]) -> BeforeValidator:
    ...
