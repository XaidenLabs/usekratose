export function resolveDashboardOrigin(value: string | undefined): string {
  const candidate = value ?? "http://localhost:3001";
  const url = new URL(candidate);
  const isLocal = url.hostname === "localhost" || url.hostname === "127.0.0.1";
  if (
    url.username !== "" ||
    url.password !== "" ||
    url.search !== "" ||
    url.hash !== "" ||
    url.pathname !== "/" ||
    (url.protocol !== "https:" && !isLocal)
  ) {
    throw new Error(
      "DASHBOARD_ORIGIN must be an HTTPS origin without credentials or a path",
    );
  }
  return url.origin;
}
