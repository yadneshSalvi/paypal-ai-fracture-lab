from __future__ import annotations
from typing_extensions import NotRequired, TypedDict
from ..core import SdkBaseModel
from .enums.payee_payment_method_preference import PayeePaymentMethodPreference, PayeePaymentMethodPreferenceOrStr
from .enums.standard_entry_class_code import StandardEntryClassCode, StandardEntryClassCodeOrStr

class PaymentMethodPreference(SdkBaseModel):
    payee_preferred: PayeePaymentMethodPreferenceOrStr = PayeePaymentMethodPreference.UNRESTRICTED
    standard_entry_class_code: StandardEntryClassCodeOrStr = StandardEntryClassCode.WEB

class PaymentMethodPreferenceDict(TypedDict):
    payee_preferred: NotRequired[PayeePaymentMethodPreferenceOrStr]
    standard_entry_class_code: NotRequired[StandardEntryClassCodeOrStr]
