import { afterEach, describe, expect, it } from "vitest";

import { backendUrl, marketingUrl } from "../lib/backend.js";

const originalEnvironment = { ...process.env };

afterEach(() => {
  process.env = { ...originalEnvironment };
});

describe("dashboard backend origin contract", () => {
  it("uses the canonical public origin before deployment aliases", () => {
    process.env.NEXT_PUBLIC_MARKETING_URL = "https://usekratose.site";
    process.env.USEKRATOSE_API_URL = "https://usekratose.vercel.app";

    expect(backendUrl("/api/v1/dashboard")).toBe(
      "https://usekratose.site/api/v1/dashboard",
    );
    expect(marketingUrl("/login")).toBe("https://usekratose.site/login");
  });

  it("rejects insecure remote and credentialed origins", () => {
    process.env.NEXT_PUBLIC_MARKETING_URL = "http://example.com";
    expect(() => backendUrl("/api/health")).toThrow("HTTPS or localhost");

    process.env.NEXT_PUBLIC_MARKETING_URL = "https://user:pass@example.com";
    expect(() => backendUrl("/api/health")).toThrow("HTTPS or localhost");
  });
});
