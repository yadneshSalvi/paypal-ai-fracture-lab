from __future__ import annotations
from typing_extensions import NotRequired, TypedDict
from ..core import UNSET, Optional, SdkBaseModel
from .enums.disbursement_mode import DisbursementMode, DisbursementModeOrStr
from .platform_fee import PlatformFee, PlatformFeeDict

class PaymentInstruction(SdkBaseModel):
    platform_fees: Optional[list[PlatformFee]] = UNSET
    disbursement_mode: DisbursementModeOrStr = DisbursementMode.INSTANT
    payee_pricing_tier_id: Optional[str] = UNSET
    payee_receivable_fx_rate_id: Optional[str] = UNSET

class PaymentInstructionDict(TypedDict):
    platform_fees: NotRequired[list[PlatformFeeDict]]
    disbursement_mode: NotRequired[DisbursementModeOrStr]
    payee_pricing_tier_id: NotRequired[str]
    payee_receivable_fx_rate_id: NotRequired[str]
