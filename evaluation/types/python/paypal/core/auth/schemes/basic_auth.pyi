from __future__ import annotations
from base64 import b64encode
from dataclasses import dataclass
from typing import TypeAlias
from pydantic import BaseModel, ConfigDict, Field, field_validator
from typing_extensions import TypedDict
from ...params import param
from ..models import AuthParams

class BasicAuthCredentials(BaseModel):
    model_config = ConfigDict(frozen=True, extra='forbid')
    username: str
    password: str = Field(repr=False)

    @field_validator('username')
    @classmethod
    def _reject_colon(cls, value: str) -> str:
        ...

    @classmethod
    def coerce(cls, value: BasicAuthCredentialsOrDict) -> BasicAuthCredentials:
        ...

class BasicAuthCredentialsDict(TypedDict):
    username: str
    password: str
BasicAuthCredentialsOrDict: TypeAlias = BasicAuthCredentials | BasicAuthCredentialsDict

@dataclass(frozen=True, slots=True)
class BasicAuthScheme:
    credentials: BasicAuthCredentials

    def apply(self) -> AuthParams:
        ...
