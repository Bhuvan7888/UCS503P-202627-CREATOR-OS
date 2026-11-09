# Creator OS — backend

FastAPI app organised by feature (`features/<feature>/`) with cross-cutting code in `shared/`.

```bash
uv sync
uv run uvicorn main:app --reload --port 8000   # http://localhost:8000/docs
uv run pytest -q
```

See the root [README](../README.md), [docs/ARCHITECTURE.md](../docs/ARCHITECTURE.md) and [docs/FEATURES.md](../docs/FEATURES.md).
