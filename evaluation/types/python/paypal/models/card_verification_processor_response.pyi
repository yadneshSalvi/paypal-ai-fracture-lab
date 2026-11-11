from __future__ import annotations
from typing_extensions import NotRequired, TypedDict
from ..core import UNSET, Optional, SdkBaseModel
from .enums.avs_code import AvsCodeOrStr
from .enums.cvv_code import CvvCodeOrStr

class CardVerificationProcessorResponse(SdkBaseModel):
    avs_code: Optional[AvsCodeOrStr] = UNSET
    cvv_code: Optional[CvvCodeOrStr] = UNSET

class CardVerificationProcessorResponseDict(TypedDict):
    avs_code: NotRequired[AvsCodeOrStr]
    cvv_code: NotRequired[CvvCodeOrStr]
