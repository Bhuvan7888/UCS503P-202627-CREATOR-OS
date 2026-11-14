import path from "node:path";
import { loadEnvConfig } from "@next/env";
import type { NextConfig } from "next";

// One environment file for the whole repo lives at the repo root (see /.env.example).
// Next only reads env files from this folder by default, so load the root one explicitly.
// forceReload: Next has already loaded this folder's env by now, and @next/env otherwise returns that cached
// result and silently skips the root file.
loadEnvConfig(
  path.resolve(process.cwd(), ".."),
  process.env.NODE_ENV !== "production",
  console,
  true,
);

// Sent with every page: no framing by other sites (clickjacking), no MIME sniffing, HTTPS only,
// minimal referrers, and no camera/microphone/location access.
const SECURITY_HEADERS = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async redirects() {
    // Analytics merged into the brand Home (2026-11-14)
    return [{ source: "/analytics", destination: "/brand", permanent: true }];
  },
  async headers() {
    return [{ source: "/:path*", headers: SECURITY_HEADERS }];
  },
};

export default nextConfig;
