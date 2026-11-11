from __future__ import annotations
from typing_extensions import NotRequired, TypedDict
from ..core import UNSET, Optional, SdkBaseModel
from .enums.payment_initiator import PaymentInitiatorOrStr
from .enums.stored_payment_source_payment_type import StoredPaymentSourcePaymentTypeOrStr
from .enums.stored_payment_source_usage_type import StoredPaymentSourceUsageType, StoredPaymentSourceUsageTypeOrStr
from .network_transaction import NetworkTransaction, NetworkTransactionDict

class CardStoredCredential(SdkBaseModel):
    payment_initiator: PaymentInitiatorOrStr
    payment_type: StoredPaymentSourcePaymentTypeOrStr
    usage: StoredPaymentSourceUsageTypeOrStr = StoredPaymentSourceUsageType.DERIVED
    previous_network_transaction_reference: Optional[NetworkTransaction] = UNSET

class CardStoredCredentialDict(TypedDict):
    payment_initiator: PaymentInitiatorOrStr
    payment_type: StoredPaymentSourcePaymentTypeOrStr
    usage: NotRequired[StoredPaymentSourceUsageTypeOrStr]
    previous_network_transaction_reference: NotRequired[NetworkTransactionDict]
