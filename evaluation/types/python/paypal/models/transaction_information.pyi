from __future__ import annotations
from typing_extensions import NotRequired, TypedDict
from ..core import UNSET, Optional, SdkBaseModel
from .enums.pay_pal_reference_id_type import PayPalReferenceIdTypeOrStr
from .money import Money, MoneyDict

class TransactionInformation(SdkBaseModel):
    paypal_account_id: Optional[str] = UNSET
    transaction_id: Optional[str] = UNSET
    paypal_reference_id: Optional[str] = UNSET
    paypal_reference_id_type: Optional[PayPalReferenceIdTypeOrStr] = UNSET
    transaction_event_code: Optional[str] = UNSET
    transaction_initiation_date: Optional[str] = UNSET
    transaction_updated_date: Optional[str] = UNSET
    transaction_amount: Optional[Money] = UNSET
    fee_amount: Optional[Money] = UNSET
    discount_amount: Optional[Money] = UNSET
    insurance_amount: Optional[Money] = UNSET
    sales_tax_amount: Optional[Money] = UNSET
    shipping_amount: Optional[Money] = UNSET
    shipping_discount_amount: Optional[Money] = UNSET
    shipping_tax_amount: Optional[Money] = UNSET
    other_amount: Optional[Money] = UNSET
    tip_amount: Optional[Money] = UNSET
    transaction_status: Optional[str] = UNSET
    transaction_subject: Optional[str] = UNSET
    transaction_note: Optional[str] = UNSET
    payment_tracking_id: Optional[str] = UNSET
    bank_reference_id: Optional[str] = UNSET
    ending_balance: Optional[Money] = UNSET
    available_balance: Optional[Money] = UNSET
    invoice_id: Optional[str] = UNSET
    custom_field: Optional[str] = UNSET
    protection_eligibility: Optional[str] = UNSET
    credit_term: Optional[str] = UNSET
    credit_transactional_fee: Optional[Money] = UNSET
    credit_promotional_fee: Optional[Money] = UNSET
    annual_percentage_rate: Optional[str] = UNSET
    payment_method_type: Optional[str] = UNSET
    instrument_type: Optional[str] = UNSET
    instrument_sub_type: Optional[str] = UNSET

class TransactionInformationDict(TypedDict):
    paypal_account_id: NotRequired[str]
    transaction_id: NotRequired[str]
    paypal_reference_id: NotRequired[str]
    paypal_reference_id_type: NotRequired[PayPalReferenceIdTypeOrStr]
    transaction_event_code: NotRequired[str]
    transaction_initiation_date: NotRequired[str]
    transaction_updated_date: NotRequired[str]
    transaction_amount: NotRequired[MoneyDict]
    fee_amount: NotRequired[MoneyDict]
    discount_amount: NotRequired[MoneyDict]
    insurance_amount: NotRequired[MoneyDict]
    sales_tax_amount: NotRequired[MoneyDict]
    shipping_amount: NotRequired[MoneyDict]
    shipping_discount_amount: NotRequired[MoneyDict]
    shipping_tax_amount: NotRequired[MoneyDict]
    other_amount: NotRequired[MoneyDict]
    tip_amount: NotRequired[MoneyDict]
    transaction_status: NotRequired[str]
    transaction_subject: NotRequired[str]
    transaction_note: NotRequired[str]
    payment_tracking_id: NotRequired[str]
    bank_reference_id: NotRequired[str]
    ending_balance: NotRequired[MoneyDict]
    available_balance: NotRequired[MoneyDict]
    invoice_id: NotRequired[str]
    custom_field: NotRequired[str]
    protection_eligibility: NotRequired[str]
    credit_term: NotRequired[str]
    credit_transactional_fee: NotRequired[MoneyDict]
    credit_promotional_fee: NotRequired[MoneyDict]
    annual_percentage_rate: NotRequired[str]
    payment_method_type: NotRequired[str]
    instrument_type: NotRequired[str]
    instrument_sub_type: NotRequired[str]
