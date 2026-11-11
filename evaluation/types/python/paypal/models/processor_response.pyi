from __future__ import annotations
from typing_extensions import NotRequired, TypedDict
from ..core import UNSET, Optional, SdkBaseModel
from .enums.avs_code import AvsCodeOrStr
from .enums.cvv_code import CvvCodeOrStr
from .enums.payment_advice_code import PaymentAdviceCodeOrStr
from .enums.processor_response_code import ProcessorResponseCodeOrStr

class ProcessorResponse(SdkBaseModel):
    avs_code: Optional[AvsCodeOrStr] = UNSET
    cvv_code: Optional[CvvCodeOrStr] = UNSET
    response_code: Optional[ProcessorResponseCodeOrStr] = UNSET
    payment_advice_code: Optional[PaymentAdviceCodeOrStr] = UNSET

class ProcessorResponseDict(TypedDict):
    avs_code: NotRequired[AvsCodeOrStr]
    cvv_code: NotRequired[CvvCodeOrStr]
    response_code: NotRequired[ProcessorResponseCodeOrStr]
    payment_advice_code: NotRequired[PaymentAdviceCodeOrStr]
