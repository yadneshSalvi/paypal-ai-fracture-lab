from __future__ import annotations
from typing_extensions import NotRequired, TypedDict
from ..core import UNSET, Optional, SdkBaseModel
from .card_customer_information import CardCustomerInformation, CardCustomerInformationDict
from .card_verification import CardVerification, CardVerificationDict
from .vault_instruction_base import VaultInstructionBase, VaultInstructionBaseDict

class CardAttributes(SdkBaseModel):
    customer: Optional[CardCustomerInformation] = UNSET
    vault: Optional[VaultInstructionBase] = UNSET
    verification: Optional[CardVerification] = UNSET

class CardAttributesDict(TypedDict):
    customer: NotRequired[CardCustomerInformationDict]
    vault: NotRequired[VaultInstructionBaseDict]
    verification: NotRequired[CardVerificationDict]
