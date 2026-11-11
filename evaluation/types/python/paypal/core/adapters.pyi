from __future__ import annotations
from functools import reduce
from operator import or_
from threading import RLock
from types import UnionType
from typing import Any, Final, TypeVar, Union, get_args, get_origin
from pydantic import TypeAdapter
from typing_extensions import TypeForm, is_typeddict
T = TypeVar('T')
_CONTAINERS: Final = (list, dict)
_ADAPTER_CACHE_MAX: Final = 512
_adapter_lock: Final = RLock()
_adapters: Final[dict[object, TypeAdapter[Any]]] = {}

def validation_target(type_: TypeForm[T]) -> TypeForm[T]:
    ...

def _is_companion(type_: TypeForm[Any]) -> bool:
    ...

def _strip_companions(type_: TypeForm[Any]) -> TypeForm[Any]:
    ...

def adapter_for(type_: TypeForm[T]) -> TypeAdapter[T]:
    ...
