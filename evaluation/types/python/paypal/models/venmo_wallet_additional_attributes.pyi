from __future__ import annotations
from typing_extensions import NotRequired, TypedDict
from ..core import UNSET, Optional, SdkBaseModel
from .venmo_wallet_customer_information import VenmoWalletCustomerInformation, VenmoWalletCustomerInformationDict
from .venmo_wallet_vault_attributes import VenmoWalletVaultAttributes, VenmoWalletVaultAttributesDict

class VenmoWalletAdditionalAttributes(SdkBaseModel):
    customer: Optional[VenmoWalletCustomerInformation] = UNSET
    vault: Optional[VenmoWalletVaultAttributes] = UNSET

class VenmoWalletAdditionalAttributesDict(TypedDict):
    customer: NotRequired[VenmoWalletCustomerInformationDict]
    vault: NotRequired[VenmoWalletVaultAttributesDict]
