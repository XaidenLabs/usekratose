import { createHmac, timingSafeEqual } from "node:crypto";

interface GitHubInstallationState {
  readonly expiresAt: number;
  readonly programId: string;
  readonly userId: string;
}

function secret(): string {
  const value = process.env.GITHUB_STATE_SECRET?.trim();
  if (!value || value.length < 32) {
    throw new Error("GITHUB_STATE_SECRET must contain at least 32 characters");
  }
  return value;
}

function encode(value: string): string {
  return Buffer.from(value).toString("base64url");
}

function signature(payload: string): string {
  return createHmac("sha256", secret()).update(payload).digest("base64url");
}

export function createGitHubInstallationState(
  userId: string,
  programId: string,
): string {
  const payload = encode(
    JSON.stringify({
      expiresAt: Date.now() + 10 * 60_000,
      programId,
      userId,
    } satisfies GitHubInstallationState),
  );
  return `${payload}.${signature(payload)}`;
}

export function verifyGitHubInstallationState(
  value: string,
): GitHubInstallationState {
  const [payload, suppliedSignature] = value.split(".", 2);
  if (!payload || !suppliedSignature)
    throw new Error("GitHub state is invalid");
  const expected = Buffer.from(signature(payload));
  const supplied = Buffer.from(suppliedSignature);
  if (
    expected.byteLength !== supplied.byteLength ||
    !timingSafeEqual(expected, supplied)
  ) {
    throw new Error("GitHub state signature is invalid");
  }
  const parsed = JSON.parse(
    Buffer.from(payload, "base64url").toString("utf8"),
  ) as GitHubInstallationState;
  if (
    typeof parsed.userId !== "string" ||
    typeof parsed.programId !== "string" ||
    typeof parsed.expiresAt !== "number" ||
    parsed.expiresAt < Date.now()
  ) {
    throw new Error("GitHub state has expired or is invalid");
  }
  return parsed;
}
