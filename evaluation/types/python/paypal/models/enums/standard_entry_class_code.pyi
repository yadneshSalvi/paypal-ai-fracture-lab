from enum import Enum
from typing import Annotated, TypeAlias
from ...core import open_enum_validator

class StandardEntryClassCode(str, Enum):
    TEL = 'TEL'
    WEB = 'WEB'
    CCD = 'CCD'
    PPD = 'PPD'
    __str__ = str.__str__
StandardEntryClassCodeOrStr: TypeAlias = Annotated[StandardEntryClassCode | str, open_enum_validator(StandardEntryClassCode)]
