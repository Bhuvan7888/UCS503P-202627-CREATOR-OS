"""Redirects Supabase repository calls to the in-memory demo store when demo mode is active."""

from features.demo_mode.mode import is_demo_mode


class DemoFallbackMixin:
    _fallback_repo_name: str = ""

    def __getattribute__(self, name):
        if not name.startswith("_") and name != "client" and is_demo_mode():
            # Imported lazily: the store pulls in every feature's models.
            from features.demo_mode.demo_store import store

            store.seed_if_needed()
            fb = getattr(store, self._fallback_repo_name, None)
            if fb and hasattr(fb, name):
                return getattr(fb, name)
        return super().__getattribute__(name)
