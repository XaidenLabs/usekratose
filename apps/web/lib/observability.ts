interface LogDetails {
  readonly [key: string]: boolean | number | string | null | undefined;
}

export function logServerEvent(
  level: "error" | "info" | "warn",
  event: string,
  details: LogDetails = {},
): void {
  const entry = JSON.stringify({
    event,
    level,
    release: process.env.VERCEL_GIT_COMMIT_SHA ?? null,
    service: process.env.SERVICE_NAME ?? "web",
    timestamp: new Date().toISOString(),
    ...details,
  });
  console[level](entry);
}

export function errorName(error: unknown): string {
  return error instanceof Error ? error.name : "UnknownError";
}
