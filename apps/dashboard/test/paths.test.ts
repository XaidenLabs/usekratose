import { describe, expect, it } from "vitest";

import { DASHBOARD_BASE_PATH, dashboardPath } from "../lib/paths";

describe("dashboard paths", () => {
  it("keeps the console under its production base path", () => {
    expect(DASHBOARD_BASE_PATH).toBe("/dashboard");
    expect(dashboardPath("/api/programs")).toBe("/dashboard/api/programs");
  });

  it("normalizes relative paths", () => {
    expect(dashboardPath("programs?add=1")).toBe("/dashboard/programs?add=1");
  });
});
