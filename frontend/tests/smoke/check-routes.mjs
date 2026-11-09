// Refactor safety net: every public URL the app served at baseline must still
// be produced by `next build`. Run after a build: `npm run build && npm run test:smoke`.
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const manifestPath = join(here, "../../.next/app-path-routes-manifest.json");
const expected = JSON.parse(readFileSync(join(here, "routes.snapshot.json"), "utf8"));

let manifest;
try {
  manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
} catch {
  console.error("No build manifest found — run `npm run build` first.");
  process.exit(1);
}

const actual = new Set(Object.values(manifest));
const missing = expected.filter((url) => !actual.has(url));
const added = [...actual].filter((url) => !expected.includes(url) && !url.startsWith("/_"));

if (missing.length || added.length) {
  if (missing.length) console.error("Missing routes:", missing);
  if (added.length) console.error("Unexpected new routes:", added);
  process.exit(1);
}
console.log(`OK — all ${expected.length} routes present.`);
