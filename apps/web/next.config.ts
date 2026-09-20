import type { NextConfig } from "next";

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
