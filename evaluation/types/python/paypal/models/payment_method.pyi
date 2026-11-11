from __future__ import annotations
from typing_extensions import NotRequired, TypedDict
from ..core import SdkBaseModel
from .enums.payee_payment_method_preference import PayeePaymentMethodPreference, PayeePaymentMethodPreferenceOrStr

class PaymentMethod(SdkBaseModel):
    payee_preferred: PayeePaymentMethodPreferenceOrStr = PayeePaymentMethodPreference.UNRESTRICTED

class PaymentMethodDict(TypedDict):
    payee_preferred: NotRequired[PayeePaymentMethodPreferenceOrStr]
