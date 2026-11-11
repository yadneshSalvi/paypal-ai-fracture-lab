from __future__ import annotations
from collections.abc import Sequence
from typing import TypeVar
T = TypeVar('T')

def validate_one_of(value: T, allowed: Sequence[T], label: str) -> T:
    ...
