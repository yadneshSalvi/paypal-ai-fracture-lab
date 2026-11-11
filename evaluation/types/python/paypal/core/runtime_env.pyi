from __future__ import annotations
import platform
from typing import Final

def _operating_system() -> str:
    ...

def _python_runtime() -> str:
    ...
OPERATING_SYSTEM: Final = _operating_system()
PYTHON_RUNTIME: Final = _python_runtime()
