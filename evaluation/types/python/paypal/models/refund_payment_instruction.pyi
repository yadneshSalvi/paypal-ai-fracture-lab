from __future__ import annotations
from typing_extensions import NotRequired, TypedDict
from ..core import UNSET, Optional, SdkBaseModel
from .refund_platform_fee import RefundPlatformFee, RefundPlatformFeeDict

class RefundPaymentInstruction(SdkBaseModel):
    platform_fees: Optional[list[RefundPlatformFee]] = UNSET

class RefundPaymentInstructionDict(TypedDict):
    platform_fees: NotRequired[list[RefundPlatformFeeDict]]
