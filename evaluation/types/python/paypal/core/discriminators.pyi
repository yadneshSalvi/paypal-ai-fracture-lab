from __future__ import annotations
from dataclasses import dataclass
from typing import Any, get_args
from pydantic import GetCoreSchemaHandler, Tag
from pydantic_core import core_schema

@dataclass(frozen=True, slots=True)
class WireDiscriminator:
    property_name: str
    companion_key: str | None = None

    def __get_pydantic_core_schema__(self, source: Any, handler: GetCoreSchemaHandler) -> core_schema.CoreSchema:
        ...
