from __future__ import annotations
from typing_extensions import NotRequired, TypedDict
from ..core import UNSET, Optional, SdkBaseModel
from .cycle_execution import CycleExecution, CycleExecutionDict
from .failed_payment_details import FailedPaymentDetails, FailedPaymentDetailsDict
from .last_payment_details import LastPaymentDetails, LastPaymentDetailsDict
from .money import Money, MoneyDict

class SubscriptionBillingInformation(SdkBaseModel):
    outstanding_balance: Money
    cycle_executions: Optional[list[CycleExecution]] = UNSET
    last_payment: Optional[LastPaymentDetails] = UNSET
    next_billing_time: Optional[str] = UNSET
    final_payment_time: Optional[str] = UNSET
    failed_payments_count: int
    last_failed_payment: Optional[FailedPaymentDetails] = UNSET

class SubscriptionBillingInformationDict(TypedDict):
    outstanding_balance: MoneyDict
    cycle_executions: NotRequired[list[CycleExecutionDict]]
    last_payment: NotRequired[LastPaymentDetailsDict]
    next_billing_time: NotRequired[str]
    final_payment_time: NotRequired[str]
    failed_payments_count: int
    last_failed_payment: NotRequired[FailedPaymentDetailsDict]
