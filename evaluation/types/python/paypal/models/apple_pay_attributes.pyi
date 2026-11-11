from __future__ import annotations
from typing_extensions import NotRequired, TypedDict
from ..core import UNSET, Optional, SdkBaseModel
from .customer_information import CustomerInformation, CustomerInformationDict
from .vault_instruction import VaultInstruction, VaultInstructionDict

class ApplePayAttributes(SdkBaseModel):
    customer: Optional[CustomerInformation] = UNSET
    vault: Optional[VaultInstruction] = UNSET

class ApplePayAttributesDict(TypedDict):
    customer: NotRequired[CustomerInformationDict]
    vault: NotRequired[VaultInstructionDict]
