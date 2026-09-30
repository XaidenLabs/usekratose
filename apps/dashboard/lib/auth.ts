export const AUTH_REQUEST_TIMEOUT_MS = 15_000;

export class AuthRequestTimeoutError extends Error {
  constructor() {
    super("Authentication request timed out");
    this.name = "AuthRequestTimeoutError";
  }
}

export async function withAuthTimeout<T>(
  request: PromiseLike<T>,
  timeoutMs = AUTH_REQUEST_TIMEOUT_MS,
): Promise<T> {
  let timeout: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      Promise.resolve(request),
      new Promise<never>((_, reject) => {
        timeout = setTimeout(
          () => reject(new AuthRequestTimeoutError()),
          timeoutMs,
        );
      }),
    ]);
  } finally {
    if (timeout !== undefined) clearTimeout(timeout);
  }
}

export function authFailureMessage(error: unknown): string {
  if (error instanceof AuthRequestTimeoutError) {
    return "Authentication is taking too long. Please try again.";
  }
  if (
    error instanceof TypeError ||
    (error instanceof Error && /fetch|network/i.test(error.message))
  ) {
    return "Authentication is temporarily unreachable. Please try again.";
  }
  return error instanceof Error
    ? error.message
    : "Authentication failed. Please try again.";
}
