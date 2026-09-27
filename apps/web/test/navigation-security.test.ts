import { describe, expect, it } from "vitest";

import { isRouteWithin, safeRedirectPath } from "../lib/navigation-security.js";

describe("authentication navigation security", () => {
  it("accepts only same-origin redirect paths", () => {
    expect(safeRedirectPath("/dashboard?tab=events")).toBe(
      "/dashboard?tab=events",
    );
    expect(safeRedirectPath("https://evil.example")).toBe("/dashboard");
    expect(safeRedirectPath("//evil.example/path")).toBe("/dashboard");
    expect(safeRedirectPath("/\\evil.example")).toBe("/dashboard");
    expect(
      safeRedirectPath("/dashboard\r\nLocation: https://evil.example"),
    ).toBe("/dashboard");
  });

  it("matches complete route segments only", () => {
    expect(isRouteWithin("/dashboard", "/dashboard")).toBe(true);
    expect(isRouteWithin("/dashboard/alerts", "/dashboard")).toBe(true);
    expect(isRouteWithin("/dashboard-public", "/dashboard")).toBe(false);
  });
});
