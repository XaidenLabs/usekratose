import { existsSync } from "node:fs";
import { loadEnvFile } from "node:process";
import { resolve } from "node:path";

import type { NextConfig } from "next";

const rootEnvironment = resolve(process.cwd(), "../../.env.local");
if (existsSync(rootEnvironment)) loadEnvFile(rootEnvironment);

const dashboardOrigin = (
  process.env.DASHBOARD_ORIGIN ?? "http://localhost:3001"
).replace(/\/$/, "");

const nextConfig: NextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
  serverExternalPackages: ["postgres"],
  transpilePackages: [
    "@usekratose/alerts",
    "@usekratose/application",
    "@usekratose/core",
    "@usekratose/database",
    "@usekratose/explanations",
    "@usekratose/solana",
  ],
  async rewrites() {
    return {
      beforeFiles: [
        {
          source: "/dashboard",
          destination: `${dashboardOrigin}/dashboard`,
        },
        {
          source: "/dashboard/:path*",
          destination: `${dashboardOrigin}/dashboard/:path*`,
        },
      ],
    };
  },
  webpack: (config) => {
    config.resolve.extensionAlias = {
      ".cjs": [".cts", ".cjs"],
      ".js": [".ts", ".tsx", ".js"],
      ".mjs": [".mts", ".mjs"],
    };
    return config;
  },
};

export default nextConfig;
