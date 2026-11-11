from enum import Enum
from typing import Annotated, TypeAlias
from ...core import open_enum_validator

class LinkHttpMethod(str, Enum):
    GET = 'GET'
    POST = 'POST'
    PUT = 'PUT'
    DELETE = 'DELETE'
    HEAD = 'HEAD'
    CONNECT = 'CONNECT'
    OPTIONS = 'OPTIONS'
    PATCH = 'PATCH'
    __str__ = str.__str__
LinkHttpMethodOrStr: TypeAlias = Annotated[LinkHttpMethod | str, open_enum_validator(LinkHttpMethod)]
