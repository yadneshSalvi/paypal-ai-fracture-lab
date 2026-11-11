from __future__ import annotations
from typing_extensions import TypedDict
from ..core import SdkBaseModel
from .update_pricing_scheme import UpdatePricingScheme, UpdatePricingSchemeDict

class UpdatePricingSchemesRequest(SdkBaseModel):
    pricing_schemes: list[UpdatePricingScheme]

class UpdatePricingSchemesRequestDict(TypedDict):
    pricing_schemes: list[UpdatePricingSchemeDict]
