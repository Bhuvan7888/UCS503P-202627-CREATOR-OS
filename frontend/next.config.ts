import path from "node:path";
import { loadEnvConfig } from "@next/env";
import type { NextConfig } from "next";

// One environment file for the whole repo lives at the repo root (see /.env.example).
// Next only reads env files from this folder by default, so load the root one explicitly.
loadEnvConfig(path.resolve(process.cwd(), ".."));

const nextConfig: NextConfig = {};

export default nextConfig;
