from __future__ import annotations
from typing_extensions import NotRequired, TypedDict
from ..core import UNSET, Optional, SdkBaseModel
from .enums.payment_initiator import PaymentInitiatorOrStr
from .enums.stored_payment_source_usage_type import StoredPaymentSourceUsageType, StoredPaymentSourceUsageTypeOrStr
from .enums.usage_pattern import UsagePatternOrStr

class PayPalWalletStoredCredential(SdkBaseModel):
    payment_initiator: PaymentInitiatorOrStr
    charge_pattern: Optional[UsagePatternOrStr] = UNSET
    usage_pattern: Optional[UsagePatternOrStr] = UNSET
    usage: StoredPaymentSourceUsageTypeOrStr = StoredPaymentSourceUsageType.DERIVED

class PayPalWalletStoredCredentialDict(TypedDict):
    payment_initiator: PaymentInitiatorOrStr
    charge_pattern: NotRequired[UsagePatternOrStr]
    usage_pattern: NotRequired[UsagePatternOrStr]
    usage: NotRequired[StoredPaymentSourceUsageTypeOrStr]
