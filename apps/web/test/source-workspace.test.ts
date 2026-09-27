import { describe, expect, it } from "vitest";

import { parseGitHubRepositoryUrl } from "../lib/github-source";
import {
  normalizeSourcePath,
  sha256,
  sourceLanguage,
} from "../lib/source-workspace";

describe("source workspace boundaries", () => {
  it("accepts canonical GitHub repository URLs", () => {
    expect(
      parseGitHubRepositoryUrl("https://github.com/UseKratose/security.git"),
    ).toEqual({
      name: "security",
      owner: "UseKratose",
      url: "https://github.com/UseKratose/security",
    });
  });

  it("rejects non-GitHub and nested repository URLs", () => {
    expect(() =>
      parseGitHubRepositoryUrl("https://example.com/org/repo"),
    ).toThrow("github.com");
    expect(() =>
      parseGitHubRepositoryUrl("https://github.com/org/repo/issues"),
    ).toThrow("one GitHub repository");
  });

  it("normalizes safe source paths and rejects traversal", () => {
    expect(normalizeSourcePath("programs\\vault\\src\\lib.rs")).toBe(
      "programs/vault/src/lib.rs",
    );
    expect(sourceLanguage("programs/vault/src/lib.rs")).toBe("rust");
    expect(() => normalizeSourcePath("../secret.rs")).toThrow("invalid");
  });

  it("uses deployment-compatible sha256 fingerprints", () => {
    expect(sha256("fixture")).toMatch(/^sha256:[a-f0-9]{64}$/);
  });
});
