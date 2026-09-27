export function StatusBadge({ children, tone = "neutral" }: { readonly children: React.ReactNode; readonly tone?: "good" | "neutral" | "warning" | "danger" | "purple" }) {
  return <span className={`status-badge ${tone}`}>{children}</span>;
}
