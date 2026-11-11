from enum import Enum
from typing import Annotated, TypeAlias
from ...core import open_enum_validator

class VaultInstructionAction(str, Enum):
    ON_CREATE_PAYMENT_TOKENS = 'ON_CREATE_PAYMENT_TOKENS'
    ON_PAYER_APPROVAL = 'ON_PAYER_APPROVAL'
    __str__ = str.__str__
VaultInstructionActionOrStr: TypeAlias = Annotated[VaultInstructionAction | str, open_enum_validator(VaultInstructionAction)]
