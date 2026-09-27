import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { loadEnvFile } from "node:process";

import type { NextConfig } from "next";

const rootEnvironment = resolve(process.cwd(), "../../.env.local");
if (existsSync(rootEnvironment)) loadEnvFile(rootEnvironment);

const basePath = process.env.NEXT_PUBLIC_DASHBOARD_BASE_PATH ?? "/dashboard";

const nextConfig: NextConfig = {
  basePath,
  poweredByHeader: false,
  reactStrictMode: true,
};

export default nextConfig;
