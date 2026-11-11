from enum import Enum
from typing import Annotated, TypeAlias
from ...core import open_enum_validator

class TaxIdType(str, Enum):
    BR_CPF = 'BR_CPF'
    BR_CNPJ = 'BR_CNPJ'
    __str__ = str.__str__
TaxIdTypeOrStr: TypeAlias = Annotated[TaxIdType | str, open_enum_validator(TaxIdType)]
