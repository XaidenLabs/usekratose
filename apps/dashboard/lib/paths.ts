const configuredBasePath =
  process.env.NEXT_PUBLIC_DASHBOARD_BASE_PATH ?? "/dashboard";

export const DASHBOARD_BASE_PATH =
  configuredBasePath === "/"
    ? ""
    : `/${configuredBasePath.replace(/^\/+|\/+$/g, "")}`;

export function dashboardPath(path: string): string {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${DASHBOARD_BASE_PATH}${normalizedPath}`;
}
