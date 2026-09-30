const rows = Array.from({ length: 5 }, (_, index) => index);

export default function ConsoleLoading() {
  return (
    <section
      aria-busy="true"
      aria-label="Loading dashboard"
      className="console-loading"
    >
      <div className="skeleton-heading">
        <span className="skeleton skeleton-eyebrow" />
        <span className="skeleton skeleton-title" />
        <span className="skeleton skeleton-copy" />
      </div>

      <div className="skeleton-stat-grid">
        {rows.slice(0, 4).map((row) => (
          <div className="skeleton-card" key={row}>
            <span className="skeleton skeleton-label" />
            <span className="skeleton skeleton-value" />
            <span className="skeleton skeleton-copy short" />
          </div>
        ))}
      </div>

      <div className="skeleton-table">
        <div className="skeleton-table-header">
          <span className="skeleton skeleton-title compact" />
          <span className="skeleton skeleton-button" />
        </div>
        {rows.map((row) => (
          <div className="skeleton-table-row" key={row}>
            <span className="skeleton skeleton-cell wide" />
            <span className="skeleton skeleton-cell" />
            <span className="skeleton skeleton-cell" />
            <span className="skeleton skeleton-button small" />
          </div>
        ))}
      </div>
    </section>
  );
}
