from __future__ import annotations
from typing_extensions import NotRequired, TypedDict
from ..core import UNSET, Optional, SdkBaseModel
from .card_customer import CardCustomer, CardCustomerDict
from .card_verification import CardVerification, CardVerificationDict
from .vault_instruction_base import VaultInstructionBase, VaultInstructionBaseDict

class SubscriptionsCardAttributes(SdkBaseModel):
    customer: Optional[CardCustomer] = UNSET
    vault: Optional[VaultInstructionBase] = UNSET
    verification: Optional[CardVerification] = UNSET

class SubscriptionsCardAttributesDict(TypedDict):
    customer: NotRequired[CardCustomerDict]
    vault: NotRequired[VaultInstructionBaseDict]
    verification: NotRequired[CardVerificationDict]
