from enum import Enum
from typing import Annotated, TypeAlias
from ...core import open_enum_validator

class ProcessingInstruction(str, Enum):
    ORDER_COMPLETE_ON_PAYMENT_APPROVAL = 'ORDER_COMPLETE_ON_PAYMENT_APPROVAL'
    __str__ = str.__str__
ProcessingInstructionOrStr: TypeAlias = Annotated[ProcessingInstruction | str, open_enum_validator(ProcessingInstruction)]
