/** The API's error message (FastAPI `detail`) when it is a plain sentence, otherwise `fallback`. */
export function errorText(error: unknown, fallback: string): string {
  const detail = (error as { detail?: unknown } | undefined)?.detail;
  return typeof detail === "string" ? detail : fallback;
}
