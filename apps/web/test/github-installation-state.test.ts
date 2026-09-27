import { afterEach, describe, expect, it } from "vitest";

import {
  createGitHubInstallationState,
  verifyGitHubInstallationState,
} from "../lib/github-installation-state";

const previousSecret = process.env.GITHUB_STATE_SECRET;

afterEach(() => {
  if (previousSecret === undefined) delete process.env.GITHUB_STATE_SECRET;
  else process.env.GITHUB_STATE_SECRET = previousSecret;
});

describe("GitHub installation state", () => {
  it("round-trips signed, user-bound state", () => {
    process.env.GITHUB_STATE_SECRET =
      "fixture-secret-that-is-longer-than-thirty-two-characters";
    const state = createGitHubInstallationState("user-1", "program-1");
    expect(verifyGitHubInstallationState(state)).toMatchObject({
      programId: "program-1",
      userId: "user-1",
    });
  });

  it("rejects tampered state", () => {
    process.env.GITHUB_STATE_SECRET =
      "fixture-secret-that-is-longer-than-thirty-two-characters";
    const state = createGitHubInstallationState("user-1", "program-1");
    expect(() => verifyGitHubInstallationState(`${state}x`)).toThrow(
      "signature",
    );
  });
});
