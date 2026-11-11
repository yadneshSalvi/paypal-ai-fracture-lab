from __future__ import annotations
import json
from typing import Any, Literal
from pydantic import BaseModel, ConfigDict
from .optionality import strip_unset

class SdkBaseModel(BaseModel):
    model_config = ConfigDict(frozen=True, extra='allow', validate_by_name=True, validate_by_alias=True, serialize_by_alias=True, use_attribute_docstrings=True)

    def to_dict(self, *, mode: Literal['json', 'python']='json', by_alias: bool=True, exclude_unset: bool=False, exclude_defaults: bool=False, exclude_none: bool=False) -> dict[str, Any]:
        ...

    def to_json(self, *, indent: int | None=2, by_alias: bool=True, exclude_unset: bool=False, exclude_defaults: bool=False, exclude_none: bool=False) -> str:
        ...
