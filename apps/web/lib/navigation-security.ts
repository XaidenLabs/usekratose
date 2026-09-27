export function isRouteWithin(pathname: string, route: string): boolean {
  return pathname === route || pathname.startsWith(`${route}/`);
}

export function safeRedirectPath(
  value: string | null | undefined,
  fallback = "/dashboard",
): string {
  if (
    value === undefined ||
    value === null ||
    !value.startsWith("/") ||
    value.startsWith("//") ||
    value.includes("\\") ||
    /[\r\n]/.test(value)
  ) {
    return fallback;
  }

  try {
    const base = new URL("https://usekratose.invalid");
    const parsed = new URL(value, base);
    if (parsed.origin !== base.origin) return fallback;
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return fallback;
  }
}
