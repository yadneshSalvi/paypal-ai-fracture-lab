from __future__ import annotations
from typing_extensions import NotRequired, TypedDict
from ..core import UNSET, Optional, SdkBaseModel
from .apple_pay_payment_data import ApplePayPaymentData, ApplePayPaymentDataDict
from .apple_pay_tokenized_card import ApplePayTokenizedCard, ApplePayTokenizedCardDict
from .enums.apple_pay_payment_data_type import ApplePayPaymentDataTypeOrStr
from .money import Money, MoneyDict

class ApplePayDecryptedTokenData(SdkBaseModel):
    transaction_amount: Optional[Money] = UNSET
    tokenized_card: ApplePayTokenizedCard
    device_manufacturer_id: Optional[str] = UNSET
    payment_data_type: Optional[ApplePayPaymentDataTypeOrStr] = UNSET
    payment_data: Optional[ApplePayPaymentData] = UNSET

class ApplePayDecryptedTokenDataDict(TypedDict):
    transaction_amount: NotRequired[MoneyDict]
    tokenized_card: ApplePayTokenizedCardDict
    device_manufacturer_id: NotRequired[str]
    payment_data_type: NotRequired[ApplePayPaymentDataTypeOrStr]
    payment_data: NotRequired[ApplePayPaymentDataDict]
