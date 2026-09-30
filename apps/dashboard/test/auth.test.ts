import { describe, expect, it } from "vitest";

import {
  AuthRequestTimeoutError,
  authFailureMessage,
  withAuthTimeout,
} from "../lib/auth.js";

describe("dashboard authentication resilience", () => {
  it("returns successful authentication responses", async () => {
    await expect(withAuthTimeout(Promise.resolve("ok"), 10)).resolves.toBe(
      "ok",
    );
  });

  it("bounds an unavailable authentication service", async () => {
    await expect(
      withAuthTimeout(new Promise(() => undefined), 1),
    ).rejects.toBeInstanceOf(AuthRequestTimeoutError);
  });

  it("returns a stable network failure message", () => {
    expect(authFailureMessage(new TypeError("Failed to fetch"))).toBe(
      "Authentication is temporarily unreachable. Please try again.",
    );
  });
});
