from __future__ import annotations
from typing import TYPE_CHECKING

class SubscriptOnly:
    __slots__ = ()
    factory_name: str
    spelling: str
    if not TYPE_CHECKING:

        def __call__(self, *args, **kwargs):
            ...
