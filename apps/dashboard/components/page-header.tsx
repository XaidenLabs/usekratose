export function PageHeader({
  actions,
  description,
  eyebrow,
  title,
}: {
  readonly actions?: React.ReactNode;
  readonly description: string;
  readonly eyebrow: string;
  readonly title: string;
}) {
  return (
    <header className="page-header">
      <div>
        <span className="page-eyebrow">{eyebrow}</span>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {actions === undefined ? null : <div className="page-actions">{actions}</div>}
    </header>
  );
}
