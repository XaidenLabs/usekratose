export function shortAddress(value: string, start = 7, end = 5): string {
  return value.length <= start + end + 1 ? value : `${value.slice(0, start)}…${value.slice(-end)}`;
}

export function formatDate(value: string | null): string {
  if (value === null) return "Not recorded";
  return new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

export function titleCase(value: string): string {
  return value.toLowerCase().split("_").map((word) => `${word.slice(0, 1).toUpperCase()}${word.slice(1)}`).join(" ");
}
