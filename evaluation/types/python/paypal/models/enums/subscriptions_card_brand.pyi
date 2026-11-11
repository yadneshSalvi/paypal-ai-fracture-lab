from enum import Enum
from typing import Annotated, TypeAlias
from ...core import open_enum_validator

class SubscriptionsCardBrand(str, Enum):
    VISA = 'VISA'
    MASTERCARD = 'MASTERCARD'
    DISCOVER = 'DISCOVER'
    AMEX = 'AMEX'
    SOLO = 'SOLO'
    JCB = 'JCB'
    STAR = 'STAR'
    DELTA = 'DELTA'
    SWITCH = 'SWITCH'
    MAESTRO = 'MAESTRO'
    CB_NATIONALE = 'CB_NATIONALE'
    CONFIGOGA = 'CONFIGOGA'
    CONFIDIS = 'CONFIDIS'
    ELECTRON = 'ELECTRON'
    CETELEM = 'CETELEM'
    CHINA_UNION_PAY = 'CHINA_UNION_PAY'
    DINERS = 'DINERS'
    ELO = 'ELO'
    HIPER = 'HIPER'
    HIPERCARD = 'HIPERCARD'
    RUPAY = 'RUPAY'
    GE = 'GE'
    SYNCHRONY = 'SYNCHRONY'
    EFTPOS = 'EFTPOS'
    UNKNOWN = 'UNKNOWN'
    __str__ = str.__str__
SubscriptionsCardBrandOrStr: TypeAlias = Annotated[SubscriptionsCardBrand | str, open_enum_validator(SubscriptionsCardBrand)]
