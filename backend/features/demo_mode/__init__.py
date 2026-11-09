"""Demo mode: run the whole backend on a seeded in-memory dataset when Supabase is unreachable
or configured with dummy keys.

Public API of this feature. Other packages import from here, never from submodules.

`store` and the demo-auth functions are resolved lazily (PEP 562) because they import every
feature's models; importing them eagerly here would create an import cycle with the Supabase
repositories, which import `DemoFallbackMixin` from this package.
"""

from typing import TYPE_CHECKING, Any

from features.demo_mode.fallback import DemoFallbackMixin
from features.demo_mode.mode import is_demo_mode

if TYPE_CHECKING:
    from features.demo_mode.accounts import DEMO_BRANDS, DEMO_CREATORS
    from features.demo_mode.demo_auth import (
        authenticate_demo_brand,
        authenticate_demo_creator,
        resolve_demo_actor,
    )
    from features.demo_mode.demo_store import DemoStore, store

_LAZY = {
    "DEMO_BRANDS": "features.demo_mode.accounts",
    "DEMO_CREATORS": "features.demo_mode.accounts",
    "authenticate_demo_brand": "features.demo_mode.demo_auth",
    "authenticate_demo_creator": "features.demo_mode.demo_auth",
    "resolve_demo_actor": "features.demo_mode.demo_auth",
    "DemoStore": "features.demo_mode.demo_store",
    "store": "features.demo_mode.demo_store",
}


def __getattr__(name: str) -> Any:
    module = _LAZY.get(name)
    if module is None:
        raise AttributeError(f"module {__name__!r} has no attribute {name!r}")
    import importlib

    return getattr(importlib.import_module(module), name)


__all__ = [
    "DEMO_BRANDS",
    "DEMO_CREATORS",
    "DemoFallbackMixin",
    "DemoStore",
    "authenticate_demo_brand",
    "authenticate_demo_creator",
    "is_demo_mode",
    "resolve_demo_actor",
    "store",
]
