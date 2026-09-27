"use client";

import {
  AlertTriangle,
  Bot,
  Braces,
  CalendarClock,
  CheckCircle2,
  ChevronDown,
  Fingerprint,
  FileCode2,
  Github,
  History,
  KeyRound,
  LoaderCircle,
  MoreVertical,
  Pencil,
  ScanSearch,
  ShieldAlert,
  Sparkles,
  Trash2,
  Upload,
  Wrench,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { formatDate, shortAddress, titleCase } from "@/lib/format";
import { dashboardPath } from "@/lib/paths";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";
import type {
  DashboardFixReview,
  DashboardProgram,
  DashboardProgramAnalysis,
  DashboardSourceWorkspace,
} from "@/lib/types";

import { StatusBadge } from "./status-badge";

function snapshotValue(
  snapshot: Readonly<Record<string, unknown>> | null,
  key: string,
): string | null {
  const value = snapshot?.[key];
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "bigint")
    return String(value);
  return null;
}

function statusTone(status: string): "good" | "warning" | "danger" | "neutral" {
  if (status === "verified" || status === "trusted" || status === "healthy")
    return "good";
  if (status === "stale" || status === "review_required" || status === "high")
    return "warning";
  if (status === "critical") return "danger";
  return "neutral";
}

function ProgramAnalysisReport({
  onDecision,
  record,
}: {
  readonly onDecision: (
    findingId: string,
    decision: "apply" | "reject",
  ) => Promise<void>;
  readonly record: DashboardProgramAnalysis;
}) {
  const [expanded, setExpanded] = useState<string | null>(
    record.analysis.corrections[0]?.id ?? null,
  );
  const highPriority = record.analysis.corrections.filter(
    (finding) => finding.severity === "critical" || finding.severity === "high",
  ).length;
  const [pendingFinding, setPendingFinding] = useState<string | null>(null);
  const [decisionError, setDecisionError] = useState<string | null>(null);

  async function decide(findingId: string, decision: "apply" | "reject") {
    setPendingFinding(findingId);
    setDecisionError(null);
    try {
      await onDecision(findingId, decision);
    } catch (error) {
      setDecisionError(
        error instanceof Error ? error.message : "Fix decision failed",
      );
    } finally {
      setPendingFinding(null);
    }
  }

  return (
    <div className="ai-report">
      <section className="ai-report-hero">
        <div>
          <span className="page-eyebrow">Evidence-guided analysis</span>
          <h3>Gemini review complete</h3>
          <p>{record.analysis.summary}</p>
        </div>
        <div className="ai-report-provider">
          <Sparkles size={17} />
          <span>
            <b>{record.provider}</b>
            <small>{record.model}</small>
          </span>
        </div>
      </section>

      <section className="ai-report-metrics">
        <article>
          <strong>{record.analysis.corrections.length}</strong>
          <span>Corrections</span>
        </article>
        <article>
          <strong>{highPriority}</strong>
          <span>High-priority reviews</span>
        </article>
        <article>
          <strong>{record.analysis.reviewPriorities.length}</strong>
          <span>Review priorities</span>
        </article>
        <article>
          <strong>{record.cached ? "Cached" : "Fresh"}</strong>
          <span>{formatDate(record.createdAt)}</span>
        </article>
      </section>

      <section className="inspection-section ai-priority-card">
        <div className="inspection-section-heading">
          <div>
            <h3>Review priorities</h3>
            <p>Recommended order for human security review.</p>
          </div>
        </div>
        <ol>
          {record.analysis.reviewPriorities.map((priority) => (
            <li key={priority}>{priority}</li>
          ))}
        </ol>
      </section>

      <section className="ai-findings">
        <div className="inspection-section-heading ai-findings-heading">
          <div>
            <h3>Corrections and fixes</h3>
            <p>Grounded in stored snapshots and deterministic events.</p>
          </div>
          <span>{record.analysis.corrections.length} findings</span>
        </div>
        {record.analysis.corrections.length === 0 ? (
          <div className="inspection-empty ai-empty">
            <CheckCircle2 size={22} />
            No corrections were supported by the available evidence.
          </div>
        ) : (
          record.analysis.corrections.map((finding, index) => {
            const isExpanded = expanded === finding.id;
            const review = record.fixes.find(
              (candidate) => candidate.findingId === finding.id,
            );
            return (
              <article
                className={`ai-finding ${isExpanded ? "expanded" : ""}`}
                key={finding.id}
              >
                <button
                  onClick={() => setExpanded(isExpanded ? null : finding.id)}
                  type="button"
                >
                  <span className={`ai-finding-index ${finding.severity}`}>
                    {index + 1}
                  </span>
                  <span>
                    <b>{finding.title}</b>
                    <small>{finding.correction}</small>
                  </span>
                  <StatusBadge tone={statusTone(finding.severity)}>
                    {finding.severity}
                  </StatusBadge>
                  <ChevronDown className="ai-finding-chevron" size={16} />
                </button>
                {isExpanded ? (
                  <div className="ai-finding-body">
                    <section>
                      <h4>
                        <AlertTriangle size={14} />
                        Reason
                      </h4>
                      <p>{finding.reason}</p>
                    </section>
                    {finding.patches.length === 0 ? null : (
                      <section className="ai-patch-section">
                        <h4>
                          <FileCode2 size={14} />
                          Proposed code changes
                        </h4>
                        {finding.patches.map((patch) => (
                          <article
                            className="ai-code-diff"
                            key={`${patch.path}:${patch.before}`}
                          >
                            <header>
                              <code>{patch.path}</code>
                              <span>{patch.rationale}</span>
                            </header>
                            <pre className="removed">
                              <code>{patch.before}</code>
                            </pre>
                            <pre className="added">
                              <code>{patch.after}</code>
                            </pre>
                          </article>
                        ))}
                        <div className="ai-patch-actions">
                          {review?.status === "applied" ? (
                            <>
                              <StatusBadge tone="good">Applied</StatusBadge>
                              {review.pullRequestUrl === null ? null : (
                                <a
                                  href={review.pullRequestUrl}
                                  rel="noreferrer"
                                  target="_blank"
                                >
                                  Review pull request
                                </a>
                              )}
                            </>
                          ) : review?.status === "rejected" ? (
                            <StatusBadge tone="neutral">Rejected</StatusBadge>
                          ) : (
                            <>
                              <button
                                className="primary-button"
                                disabled={pendingFinding === finding.id}
                                onClick={() => decide(finding.id, "apply")}
                                type="button"
                              >
                                {pendingFinding === finding.id ? (
                                  <LoaderCircle className="spin" size={14} />
                                ) : (
                                  <Wrench size={14} />
                                )}
                                Autofix
                              </button>
                              <button
                                className="secondary-button"
                                disabled={pendingFinding === finding.id}
                                onClick={() => decide(finding.id, "reject")}
                                type="button"
                              >
                                Reject
                              </button>
                            </>
                          )}
                        </div>
                      </section>
                    )}
                    <section>
                      <h4>
                        <Wrench size={14} />
                        Fixes
                      </h4>
                      <ol>
                        {finding.fixes.map((fix) => (
                          <li key={`${fix.action}:${fix.rationale}`}>
                            <b>{fix.action}</b>
                            <p>{fix.rationale}</p>
                          </li>
                        ))}
                      </ol>
                    </section>
                    <div className="ai-evidence-links">
                      {[
                        ...finding.relatedEventIds,
                        ...finding.relatedSnapshotIds,
                      ].map((reference) => (
                        <code key={reference}>
                          {shortAddress(reference, 9, 7)}
                        </code>
                      ))}
                    </div>
                  </div>
                ) : null}
              </article>
            );
          })
        )}
      </section>

      {decisionError === null ? null : (
        <p className="form-error">{decisionError}</p>
      )}

      <p className="ai-caveat">
        <ShieldAlert size={15} />
        {record.analysis.caveat}
      </p>
    </div>
  );
}

export function ProgramInspector({
  entry,
}: {
  readonly entry: DashboardProgram;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [mutationPending, setMutationPending] = useState(false);
  const [mutationError, setMutationError] = useState<string | null>(null);
  const [view, setView] = useState<"evidence" | "analysis" | "source">(
    "evidence",
  );
  const [analysis, setAnalysis] = useState<DashboardProgramAnalysis | null>(
    null,
  );
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [analysisPending, setAnalysisPending] = useState(false);
  const [source, setSource] = useState<DashboardSourceWorkspace | null>(null);
  const [sourceError, setSourceError] = useState<string | null>(null);
  const [sourcePending, setSourcePending] = useState(false);
  const [selectedSourcePath, setSelectedSourcePath] = useState<string | null>(
    null,
  );
  const current = entry.currentSnapshot;
  const verification =
    snapshotValue(current, "verificationStatus") ?? "unknown";
  const executableHash =
    snapshotValue(current, "executableHash") ?? "Unavailable";
  const authority = snapshotValue(current, "upgradeAuthority");
  const owner = snapshotValue(current, "programOwner") ?? "Unavailable";
  const deploymentSlot = snapshotValue(current, "deploymentSlot") ?? "Unknown";
  const observedAt = snapshotValue(current, "observedAt");
  const idlHash = snapshotValue(current, "idlHash");
  const sourceRepository = snapshotValue(current, "sourceRepositoryUrl");

  useEffect(() => {
    if (!open && !editOpen && !deleteOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      setOpen(false);
      setEditOpen(false);
      setDeleteOpen(false);
    }
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [deleteOpen, editOpen, open]);

  async function runAnalysis() {
    setMenuOpen(false);
    setOpen(true);
    setView("analysis");
    setAnalysisPending(true);
    setAnalysisError(null);
    try {
      const response = await fetch(
        `/api/programs/${entry.program.id}/analysis`,
        { method: "POST" },
      );
      const body = (await response.json().catch(() => null)) as {
        readonly data?: DashboardProgramAnalysis;
        readonly error?: { readonly message?: string };
      } | null;
      if (!response.ok || body?.data === undefined) {
        setAnalysisError(
          body?.error?.message ?? "AI analysis failed. Try again.",
        );
        return;
      }
      setAnalysis(body.data);
    } catch {
      setAnalysisError("AI analysis could not reach the server. Try again.");
    } finally {
      setAnalysisPending(false);
    }
  }

  async function loadSource() {
    setSourcePending(true);
    setSourceError(null);
    try {
      const response = await fetch(
        dashboardPath(`/api/programs/${entry.program.id}/source`),
      );
      const body = (await response.json().catch(() => null)) as {
        readonly data?: DashboardSourceWorkspace | null;
        readonly error?: { readonly message?: string };
      } | null;
      if (!response.ok) {
        throw new Error(body?.error?.message ?? "Failed to load source");
      }
      const workspace = body?.data ?? null;
      setSource(workspace);
      setSelectedSourcePath(workspace?.sourceFiles[0]?.path ?? null);
    } catch (error) {
      setSourceError(
        error instanceof Error ? error.message : "Failed to load source",
      );
    } finally {
      setSourcePending(false);
    }
  }

  async function connectGitHub(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSourcePending(true);
    setSourceError(null);
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch(
        dashboardPath(`/api/programs/${entry.program.id}/source`),
        {
          body: JSON.stringify({
            action: "connect-github",
            installationId:
              String(form.get("installationId") ?? "").trim() || null,
            repositoryUrl: form.get("repositoryUrl"),
            revision: String(form.get("revision") ?? "").trim() || undefined,
          }),
          headers: { "content-type": "application/json" },
          method: "POST",
        },
      );
      const body = (await response.json().catch(() => null)) as {
        readonly data?: DashboardSourceWorkspace;
        readonly error?: { readonly message?: string };
      } | null;
      if (!response.ok || body?.data === undefined) {
        throw new Error(body?.error?.message ?? "GitHub connection failed");
      }
      setSource(body.data);
      setSelectedSourcePath(body.data.sourceFiles[0]?.path ?? null);
    } catch (error) {
      setSourceError(
        error instanceof Error ? error.message : "GitHub connection failed",
      );
    } finally {
      setSourcePending(false);
    }
  }

  async function installGitHubApp() {
    setSourcePending(true);
    setSourceError(null);
    try {
      const response = await fetch(
        `/api/programs/${entry.program.id}/github/install`,
      );
      const body = (await response.json().catch(() => null)) as {
        readonly data?: { readonly url: string };
        readonly error?: { readonly message?: string };
      } | null;
      if (!response.ok || body?.data === undefined) {
        throw new Error(body?.error?.message ?? "GitHub App is unavailable");
      }
      window.location.assign(body.data.url);
    } catch (error) {
      setSourceError(
        error instanceof Error ? error.message : "GitHub App is unavailable",
      );
      setSourcePending(false);
    }
  }

  async function uploadArtifacts(
    kind: "binary" | "idl" | "source",
    files: FileList | null,
  ) {
    if (files === null || files.length === 0) return;
    setSourcePending(true);
    setSourceError(null);
    try {
      const supabase = getSupabaseBrowserClient();
      const { data: userData, error: userError } =
        await supabase.auth.getUser();
      if (userError || userData.user === null) {
        throw new Error("Sign in again before uploading artifacts");
      }
      const uploads = [];
      for (const file of Array.from(files)) {
        const safeName = file.name.replace(/[^A-Za-z0-9_.-]/g, "-");
        const objectPath = `${userData.user.id}/${entry.program.id}/${crypto.randomUUID()}-${safeName}`;
        const contentType =
          kind === "binary"
            ? "application/octet-stream"
            : kind === "idl"
              ? "application/json"
              : "text/plain";
        const { error } = await supabase.storage
          .from("program-artifacts")
          .upload(objectPath, file, { contentType });
        if (error) throw new Error(error.message);
        uploads.push({
          filePath: file.webkitRelativePath || file.name,
          kind,
          objectPath,
        });
      }
      const response = await fetch(
        dashboardPath(`/api/programs/${entry.program.id}/source`),
        {
          body: JSON.stringify({ action: "register-uploads", uploads }),
          headers: { "content-type": "application/json" },
          method: "POST",
        },
      );
      const body = (await response.json().catch(() => null)) as {
        readonly data?: DashboardSourceWorkspace;
        readonly error?: { readonly message?: string };
      } | null;
      if (!response.ok || body?.data === undefined) {
        throw new Error(body?.error?.message ?? "Artifact registration failed");
      }
      setSource(body.data);
      setSelectedSourcePath(body.data.sourceFiles[0]?.path ?? null);
    } catch (error) {
      setSourceError(
        error instanceof Error ? error.message : "Artifact upload failed",
      );
    } finally {
      setSourcePending(false);
    }
  }

  async function decideFix(findingId: string, decision: "apply" | "reject") {
    if (analysis === null) return;
    const response = await fetch(
      `/api/programs/${entry.program.id}/analysis/${analysis.analysisId}/findings/${findingId}`,
      {
        body: JSON.stringify({ decision }),
        headers: { "content-type": "application/json" },
        method: "POST",
      },
    );
    const body = (await response.json().catch(() => null)) as {
      readonly data?: DashboardFixReview;
      readonly error?: { readonly message?: string };
    } | null;
    if (!response.ok || body?.data === undefined) {
      throw new Error(body?.error?.message ?? "Fix decision failed");
    }
    setAnalysis((current) =>
      current === null
        ? null
        : {
            ...current,
            fixes: current.fixes.map((fix) =>
              fix.findingId === findingId ? body.data! : fix,
            ),
          },
    );
    if (decision === "apply" && source?.provider === "upload") {
      await loadSource();
    }
  }

  async function updateProgram(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMutationPending(true);
    setMutationError(null);
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch(
        dashboardPath(`/api/programs/${entry.program.id}`),
        {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            name: form.get("name"),
            network: form.get("network"),
          }),
        },
      );
      const body = (await response.json().catch(() => null)) as {
        readonly error?: { readonly message?: string };
      } | null;
      if (!response.ok) {
        setMutationError(body?.error?.message ?? "Failed to update program");
        return;
      }
      setEditOpen(false);
      router.refresh();
    } catch {
      setMutationError("The server could not be reached. Try again.");
    } finally {
      setMutationPending(false);
    }
  }

  async function deleteProgram() {
    setMutationPending(true);
    setMutationError(null);
    try {
      const response = await fetch(
        dashboardPath(`/api/programs/${entry.program.id}`),
        {
          method: "DELETE",
        },
      );
      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as {
          readonly error?: { readonly message?: string };
        } | null;
        setMutationError(body?.error?.message ?? "Failed to delete program");
        return;
      }
      setDeleteOpen(false);
      router.refresh();
    } catch {
      setMutationError("The server could not be reached. Try again.");
    } finally {
      setMutationPending(false);
    }
  }

  return (
    <>
      <div className="program-actions action-menu-wrap">
        <button
          aria-expanded={menuOpen}
          aria-label={`Actions for ${entry.displayName}`}
          className="table-action action-menu-trigger"
          onClick={() => setMenuOpen((value) => !value)}
          type="button"
        >
          <MoreVertical size={15} />
        </button>
        {menuOpen ? (
          <>
            <button
              className="action-menu-backdrop"
              onClick={() => setMenuOpen(false)}
              type="button"
            />
            <div className="action-menu" role="menu">
              <button
                onClick={() => {
                  setMenuOpen(false);
                  setView("evidence");
                  setOpen(true);
                }}
                role="menuitem"
                type="button"
              >
                <ScanSearch size={14} />
                Inspect
              </button>
              <button
                disabled={analysisPending}
                onClick={runAnalysis}
                role="menuitem"
                type="button"
              >
                {analysisPending ? (
                  <LoaderCircle className="spin" size={14} />
                ) : (
                  <Bot size={14} />
                )}
                AI Analysis
              </button>
              <button
                onClick={() => {
                  setMenuOpen(false);
                  setMutationError(null);
                  setEditOpen(true);
                }}
                role="menuitem"
                type="button"
              >
                <Pencil size={14} />
                Edit
              </button>
              <button
                className="danger"
                onClick={() => {
                  setMenuOpen(false);
                  setMutationError(null);
                  setDeleteOpen(true);
                }}
                role="menuitem"
                type="button"
              >
                <Trash2 size={14} />
                Delete
              </button>
            </div>
          </>
        ) : null}
      </div>
      {editOpen ? (
        <div
          className="modal-overlay"
          onMouseDown={() => setEditOpen(false)}
          role="presentation"
        >
          <section
            aria-label={`Edit ${entry.displayName}`}
            aria-modal="true"
            className="modal-card"
            onMouseDown={(event) => event.stopPropagation()}
            role="dialog"
          >
            <header>
              <div>
                <h2>Edit program</h2>
                <p>Rename this monitor or move it to another Solana network.</p>
              </div>
              <button
                aria-label="Close"
                className="icon-button"
                onClick={() => setEditOpen(false)}
                type="button"
              >
                <X size={17} />
              </button>
            </header>
            <form onSubmit={updateProgram}>
              <label>
                Program name
                <input
                  defaultValue={entry.displayName}
                  maxLength={80}
                  minLength={1}
                  name="name"
                  required
                />
              </label>
              <label>
                Program address
                <input disabled readOnly value={entry.program.address} />
              </label>
              <p className="field-help">
                The address is immutable. Changing networks creates a verified
                baseline on the target network before the old monitor is
                detached.
              </p>
              <label>
                Network
                <select defaultValue={entry.program.cluster} name="network">
                  <option value="devnet">Devnet</option>
                  <option value="mainnet-beta">Mainnet beta</option>
                </select>
              </label>
              {mutationError === null ? null : (
                <p className="form-error">{mutationError}</p>
              )}
              <footer>
                <button
                  className="secondary-button"
                  disabled={mutationPending}
                  onClick={() => setEditOpen(false)}
                  type="button"
                >
                  Cancel
                </button>
                <button
                  className="primary-button"
                  disabled={mutationPending}
                  type="submit"
                >
                  {mutationPending ? (
                    <LoaderCircle className="spin" size={15} />
                  ) : (
                    <Pencil size={15} />
                  )}
                  {mutationPending ? "Saving…" : "Save changes"}
                </button>
              </footer>
            </form>
          </section>
        </div>
      ) : null}
      {deleteOpen ? (
        <div
          className="modal-overlay"
          onMouseDown={() => setDeleteOpen(false)}
          role="presentation"
        >
          <section
            aria-label={`Delete ${entry.displayName}`}
            aria-modal="true"
            className="modal-card delete-program-card"
            onMouseDown={(event) => event.stopPropagation()}
            role="alertdialog"
          >
            <header>
              <div>
                <h2>Stop monitoring {entry.displayName}?</h2>
                <p>
                  This detaches the program from your workspace. Stored global
                  evidence is preserved.
                </p>
              </div>
              <button
                aria-label="Close"
                className="icon-button"
                onClick={() => setDeleteOpen(false)}
                type="button"
              >
                <X size={17} />
              </button>
            </header>
            <div className="delete-program-body">
              <code>{entry.program.address}</code>
              {mutationError === null ? null : (
                <p className="form-error">{mutationError}</p>
              )}
              <footer>
                <button
                  className="secondary-button"
                  disabled={mutationPending}
                  onClick={() => setDeleteOpen(false)}
                  type="button"
                >
                  Cancel
                </button>
                <button
                  className="danger-button"
                  disabled={mutationPending}
                  onClick={deleteProgram}
                  type="button"
                >
                  {mutationPending ? (
                    <LoaderCircle className="spin" size={15} />
                  ) : (
                    <Trash2 size={15} />
                  )}
                  {mutationPending ? "Removing…" : "Delete monitor"}
                </button>
              </footer>
            </div>
          </section>
        </div>
      ) : null}
      {open ? (
        <div
          className="inspection-overlay"
          role="presentation"
          onMouseDown={() => setOpen(false)}
        >
          <section
            aria-label={`Inspect program ${entry.program.address}`}
            aria-modal="true"
            className="inspection-panel"
            onMouseDown={(event) => event.stopPropagation()}
            role="dialog"
          >
            <header className="inspection-header">
              <div>
                <span className="page-eyebrow">Program inspection</span>
                <h2>{entry.displayName}</h2>
                <code>{entry.program.address}</code>
              </div>
              <button
                aria-label="Close program inspection"
                className="icon-button"
                onClick={() => setOpen(false)}
                type="button"
              >
                <X size={18} />
              </button>
            </header>

            <div className="inspection-toolbar">
              <button
                className={`inspection-view-button ${view === "evidence" ? "active" : ""}`}
                onClick={() => setView("evidence")}
                type="button"
              >
                <ScanSearch size={14} />
                Evidence
              </button>
              <button
                className={`inspection-view-button ${view === "analysis" ? "active" : ""}`}
                onClick={() => setView("analysis")}
                type="button"
              >
                <Bot size={14} />
                AI Analysis
              </button>
              <button
                className={`inspection-view-button ${view === "source" ? "active" : ""}`}
                onClick={() => {
                  setView("source");
                  if (source === null) void loadSource();
                }}
                type="button"
              >
                <FileCode2 size={14} />
                Source &amp; Build
              </button>
              <div className="inspection-statuses">
                <StatusBadge
                  tone={
                    entry.program.monitoringStatus === "healthy"
                      ? "good"
                      : "warning"
                  }
                >
                  {entry.program.monitoringStatus}
                </StatusBadge>
                <StatusBadge tone="purple">{entry.program.cluster}</StatusBadge>
                <StatusBadge tone={statusTone(entry.securityStatus)}>
                  {titleCase(entry.securityStatus)}
                </StatusBadge>
              </div>
            </div>

            <div className="inspection-content">
              {view === "source" ? (
                sourcePending ? (
                  <section className="ai-analysis-loading">
                    <span>
                      <LoaderCircle className="spin" size={21} />
                    </span>
                    <div>
                      <h3>Loading source evidence</h3>
                      <p>
                        Validating private artifacts and repository metadata.
                      </p>
                    </div>
                    <i />
                  </section>
                ) : (
                  <div className="source-workspace">
                    <section className="source-connect-grid">
                      <form
                        className="inspection-section source-connect-card"
                        onSubmit={connectGitHub}
                      >
                        <div className="inspection-section-heading">
                          <div>
                            <h3>
                              <Github size={16} /> Connect GitHub
                            </h3>
                            <p>
                              Public repositories work immediately. Private
                              repositories require a GitHub App installation.
                            </p>
                          </div>
                        </div>
                        <label>
                          Repository URL
                          <input
                            defaultValue={source?.repositoryUrl ?? ""}
                            name="repositoryUrl"
                            placeholder="https://github.com/org/repository"
                            required
                            type="url"
                          />
                        </label>
                        <div className="source-form-row">
                          <label>
                            Branch or commit
                            <input
                              defaultValue={source?.revision ?? ""}
                              name="revision"
                              placeholder="main"
                            />
                          </label>
                          <label>
                            Installation ID
                            <input
                              defaultValue={source?.githubInstallationId ?? ""}
                              inputMode="numeric"
                              name="installationId"
                              placeholder="Private repositories only"
                            />
                          </label>
                        </div>
                        <button className="primary-button" type="submit">
                          <Github size={15} />
                          Connect repository
                        </button>
                        <button
                          className="secondary-button"
                          onClick={() => void installGitHubApp()}
                          type="button"
                        >
                          <Github size={15} />
                          Install for private repositories
                        </button>
                      </form>

                      <section className="inspection-section source-connect-card">
                        <div className="inspection-section-heading">
                          <div>
                            <h3>
                              <Upload size={16} /> Upload evidence
                            </h3>
                            <p>
                              Source is editable. IDLs describe interfaces.
                              `.so` files are used only for deployment
                              verification.
                            </p>
                          </div>
                        </div>
                        <div className="artifact-upload-grid">
                          <label className="artifact-upload">
                            <Braces size={18} />
                            <b>Source files</b>
                            <span>Rust, Cargo, and Anchor files</span>
                            <input
                              accept=".rs,.toml,.lock,text/plain,text/x-rust"
                              multiple
                              onChange={(event) =>
                                void uploadArtifacts(
                                  "source",
                                  event.target.files,
                                )
                              }
                              type="file"
                            />
                          </label>
                          <label className="artifact-upload">
                            <FileCode2 size={18} />
                            <b>Anchor IDL</b>
                            <span>Normalized and hashed JSON</span>
                            <input
                              accept=".json,application/json"
                              onChange={(event) =>
                                void uploadArtifacts("idl", event.target.files)
                              }
                              type="file"
                            />
                          </label>
                          <label className="artifact-upload">
                            <Fingerprint size={18} />
                            <b>Build artifact</b>
                            <span>`.so` fingerprint verification</span>
                            <input
                              accept=".so,application/octet-stream"
                              onChange={(event) =>
                                void uploadArtifacts(
                                  "binary",
                                  event.target.files,
                                )
                              }
                              type="file"
                            />
                          </label>
                        </div>
                      </section>
                    </section>

                    {sourceError === null ? null : (
                      <p className="form-error">{sourceError}</p>
                    )}

                    {source === null ? (
                      <section className="inspection-empty source-empty">
                        <FileCode2 size={24} />
                        Connect a repository or upload source evidence to enable
                        code-level analysis and reviewable patches.
                      </section>
                    ) : (
                      <>
                        <section className="source-evidence-strip">
                          <article>
                            <span>Provider</span>
                            <strong>{titleCase(source.provider)}</strong>
                          </article>
                          <article>
                            <span>Source files</span>
                            <strong>{source.files.length}</strong>
                          </article>
                          <article>
                            <span>IDL</span>
                            <strong>
                              {source.idlHash === null
                                ? "Unavailable"
                                : "Attached"}
                            </strong>
                          </article>
                          <article>
                            <span>Build match</span>
                            <strong>
                              {source.binaryMatchesDeployment === null
                                ? "Not checked"
                                : source.binaryMatchesDeployment
                                  ? "Verified"
                                  : "Mismatch"}
                            </strong>
                          </article>
                        </section>
                        <section className="source-browser inspection-section">
                          <aside>
                            <header>
                              <h3>Build code</h3>
                              <span>{source.sourceFiles.length} readable</span>
                            </header>
                            {source.sourceFiles.map((file) => (
                              <button
                                className={
                                  selectedSourcePath === file.path
                                    ? "active"
                                    : ""
                                }
                                key={file.path}
                                onClick={() => setSelectedSourcePath(file.path)}
                                type="button"
                              >
                                <FileCode2 size={14} />
                                {file.path}
                              </button>
                            ))}
                          </aside>
                          <article>
                            {selectedSourcePath === null ? (
                              <div className="inspection-empty">
                                No readable source file is available.
                              </div>
                            ) : (
                              <>
                                <header>
                                  <code>{selectedSourcePath}</code>
                                </header>
                                <pre>
                                  <code>
                                    {source.sourceFiles.find(
                                      (file) =>
                                        file.path === selectedSourcePath,
                                    )?.content ?? ""}
                                  </code>
                                </pre>
                              </>
                            )}
                          </article>
                        </section>
                      </>
                    )}
                  </div>
                )
              ) : view === "analysis" ? (
                analysisPending ? (
                  <section className="ai-analysis-loading">
                    <span>
                      <LoaderCircle className="spin" size={21} />
                    </span>
                    <div>
                      <h3>Analyzing stored program evidence</h3>
                      <p>
                        Gemini is reviewing snapshots, events, IDL data,
                        authorities, verification, and source references.
                      </p>
                    </div>
                    <i />
                  </section>
                ) : analysisError !== null ? (
                  <section className="ai-analysis-error">
                    <AlertTriangle size={22} />
                    <div>
                      <h3>Analysis unavailable</h3>
                      <p>{analysisError}</p>
                    </div>
                    <button
                      className="secondary-button"
                      onClick={runAnalysis}
                      type="button"
                    >
                      Try again
                    </button>
                  </section>
                ) : analysis === null ? (
                  <section className="ai-analysis-empty">
                    <Bot size={28} />
                    <h3>Run evidence-guided AI analysis</h3>
                    <p>
                      Gemini will explain the deterministic facts already
                      captured by UseKratose and propose corrections with
                      reasons.
                    </p>
                    <button
                      className="primary-button"
                      onClick={runAnalysis}
                      type="button"
                    >
                      <Sparkles size={15} />
                      Analyze program
                    </button>
                  </section>
                ) : (
                  <ProgramAnalysisReport
                    onDecision={decideFix}
                    record={analysis}
                  />
                )
              ) : (
                <>
                  <section className="inspection-summary">
                    <article>
                      <span>
                        <Fingerprint size={14} />
                        Executable fingerprint
                      </span>
                      <code title={executableHash}>
                        {shortAddress(executableHash, 18, 12)}
                      </code>
                      <small>
                        {snapshotValue(current, "executableSize") ?? "Unknown"}{" "}
                        bytes
                      </small>
                    </article>
                    <article>
                      <span>
                        <CalendarClock size={14} />
                        Deployment slot
                      </span>
                      <strong>{deploymentSlot}</strong>
                      <small>
                        {observedAt === null
                          ? "Observation time unavailable"
                          : formatDate(observedAt)}
                      </small>
                    </article>
                    <article>
                      <span>
                        <KeyRound size={14} />
                        Upgrade authority
                      </span>
                      <code title={authority ?? undefined}>
                        {authority === null
                          ? "IMMUTABLE"
                          : shortAddress(authority, 12, 9)}
                      </code>
                      <small>
                        {authority === null
                          ? "Authority removed"
                          : "Program remains upgradeable"}
                      </small>
                    </article>
                    <article>
                      <span>
                        <ShieldAlert size={14} />
                        Program owner
                      </span>
                      <code title={owner}>{shortAddress(owner, 12, 9)}</code>
                      <small>{entry.program.programDataAddress}</small>
                    </article>
                  </section>

                  <section className="inspection-section">
                    <div className="inspection-section-heading">
                      <div>
                        <h3>Deployment history</h3>
                        <p>
                          Immutable snapshots observed by the monitoring worker.
                        </p>
                      </div>
                      <span>{entry.versionCount} versions</span>
                    </div>
                    <div className="inspection-history">
                      {entry.snapshots.map((snapshot, index) => {
                        const hash =
                          snapshotValue(snapshot, "executableHash") ??
                          "Unavailable";
                        const slot =
                          snapshotValue(snapshot, "deploymentSlot") ??
                          "Unknown";
                        const date = snapshotValue(snapshot, "observedAt");
                        return (
                          <article
                            key={
                              snapshotValue(snapshot, "id") ??
                              `${slot}:${index}`
                            }
                          >
                            <span className="history-icon">
                              <History size={14} />
                            </span>
                            <div>
                              <b>
                                {index === 0
                                  ? "Current deployment"
                                  : `Version ${entry.snapshots.length - index}`}
                              </b>
                              <small>
                                {date === null
                                  ? "Time unavailable"
                                  : formatDate(date)}
                              </small>
                            </div>
                            <code>{shortAddress(hash, 12, 8)}</code>
                            <span>slot {slot}</span>
                          </article>
                        );
                      })}
                    </div>
                  </section>

                  <div className="inspection-columns">
                    <section className="inspection-section">
                      <div className="inspection-section-heading">
                        <div>
                          <h3>Program intelligence</h3>
                          <p>
                            Optional metadata reported exactly as available.
                          </p>
                        </div>
                      </div>
                      <dl className="inspection-definition-list">
                        <div>
                          <dt>ProgramData</dt>
                          <dd>
                            <code>
                              {shortAddress(
                                entry.program.programDataAddress,
                                12,
                                9,
                              )}
                            </code>
                          </dd>
                        </div>
                        <div>
                          <dt>IDL</dt>
                          <dd>
                            {idlHash === null
                              ? "Unavailable"
                              : shortAddress(idlHash, 12, 8)}
                          </dd>
                        </div>
                        <div>
                          <dt>Source repository</dt>
                          <dd>
                            {sourceRepository === null
                              ? "Unavailable"
                              : sourceRepository}
                          </dd>
                        </div>
                        <div>
                          <dt>Verification</dt>
                          <dd>{verification}</dd>
                        </div>
                        <div>
                          <dt>Security events</dt>
                          <dd>{entry.eventCount}</dd>
                        </div>
                      </dl>
                    </section>

                    <section className="inspection-section">
                      <div className="inspection-section-heading">
                        <div>
                          <h3>Latest security event</h3>
                          <p>Most recent deterministic transition.</p>
                        </div>
                      </div>
                      {entry.latestEvent === null ? (
                        <div className="inspection-empty">
                          No security changes have been recorded.
                        </div>
                      ) : (
                        <div className="inspection-event">
                          <span
                            className={`event-icon ${entry.latestEvent.severity}`}
                          >
                            <ShieldAlert size={16} />
                          </span>
                          <div>
                            <b>{titleCase(entry.latestEvent.type)}</b>
                            <small>
                              {formatDate(entry.latestEvent.detectedAt)}
                            </small>
                          </div>
                          <StatusBadge
                            tone={statusTone(entry.latestEvent.severity)}
                          >
                            {entry.latestEvent.severity}
                          </StatusBadge>
                        </div>
                      )}
                    </section>
                  </div>
                </>
              )}
            </div>
          </section>
        </div>
      ) : null}
    </>
  );
}
