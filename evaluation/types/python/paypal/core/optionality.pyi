from __future__ import annotations
from typing import Any, ClassVar, Final, Literal, TypeVar, cast, final
from pydantic import BaseModel, GetCoreSchemaHandler
from pydantic_core import core_schema
from typing_extensions import TypeAliasType

@final
class UnsetType:
    _instance: ClassVar[UnsetType | None] = None

    def __new__(cls) -> UnsetType:
        ...

    def __bool__(self) -> Literal[False]:
        ...

    def __repr__(self) -> str:
        ...

    def __copy__(self) -> UnsetType:
        ...

    def __deepcopy__(self, memo: dict[int, Any]) -> UnsetType:
        ...

    def __reduce__(self) -> tuple[type[UnsetType], tuple[()]]:
        ...

    @classmethod
    def __get_pydantic_core_schema__(cls, source_type: Any, handler: GetCoreSchemaHandler) -> core_schema.CoreSchema:
        ...
UNSET: Final = UnsetType()
T = TypeVar('T')
Optional = TypeAliasType('Optional', T | UnsetType, type_params=(T,))
OptionalNullable = TypeAliasType('OptionalNullable', T | None | UnsetType, type_params=(T,))
DumpedT = TypeVar('DumpedT')

def strip_unset(value: object, dumped: DumpedT) -> DumpedT:
    ...
