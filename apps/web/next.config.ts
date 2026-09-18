import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
  serverExternalPackages: ["postgres"],
  transpilePackages: [
    "@usekratose/application",
    "@usekratose/core",
    "@usekratose/database",
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
