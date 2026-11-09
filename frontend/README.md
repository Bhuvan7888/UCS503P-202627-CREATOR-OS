# Creator OS — frontend

Next.js 16 App Router app. `src/app/` holds routing only (layouts and one-line page stubs); each feature lives in `src/features/<feature>/` and shared code in `src/shared/`.

```bash
npm install
npm run dev                 # http://localhost:3000 (backend expected at NEXT_PUBLIC_API_URL)
npm run generate:api        # refresh src/shared/lib/api-types.ts from the running backend
npm run build && npm run test:smoke
```

See the root [README](../README.md), [docs/ARCHITECTURE.md](../docs/ARCHITECTURE.md) and [docs/FEATURES.md](../docs/FEATURES.md).
