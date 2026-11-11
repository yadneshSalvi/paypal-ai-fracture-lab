from enum import Enum
from typing import Annotated, TypeAlias
from ...core import open_enum_validator

class VaultCardVerificationMethod(str, Enum):
    SCA_WHEN_REQUIRED = 'SCA_WHEN_REQUIRED'
    SCA_ALWAYS = 'SCA_ALWAYS'
    __str__ = str.__str__
VaultCardVerificationMethodOrStr: TypeAlias = Annotated[VaultCardVerificationMethod | str, open_enum_validator(VaultCardVerificationMethod)]
