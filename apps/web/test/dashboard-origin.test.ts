import { describe, expect, it } from "vitest";

import { resolveDashboardOrigin } from "../lib/dashboard-origin.js";

describe("dashboard deployment origin", () => {
  it("accepts secure production and local development origins", () => {
    expect(resolveDashboardOrigin("https://console.example.com/")).toBe(
      "https://console.example.com",
    );
    expect(resolveDashboardOrigin("http://localhost:3001")).toBe(
      "http://localhost:3001",
    );
  });

  it("rejects origins that can create unsafe or ambiguous rewrites", () => {
    expect(() => resolveDashboardOrigin("http://console.example.com")).toThrow(
      "HTTPS origin",
    );
    expect(() =>
      resolveDashboardOrigin("https://console.example.com/dashboard"),
    ).toThrow("without credentials or a path");
    expect(() =>
      resolveDashboardOrigin("https://user:pass@console.example.com"),
    ).toThrow("without credentials or a path");
  });
});
