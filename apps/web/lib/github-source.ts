import { createSign } from "node:crypto";

import { applyGroundedPatches } from "@usekratose/explanations";

const API_BASE = "https://api.github.com";
const API_VERSION = process.env.GITHUB_API_VERSION?.trim() || "2026-03-10";
const MAX_FILES = 40;
const MAX_FILE_BYTES = 100_000;
const MAX_TOTAL_BYTES = 750_000;

export interface GitHubRepositoryReference {
  readonly name: string;
  readonly owner: string;
  readonly url: string;
}

export interface RetrievedSourceFile {
  readonly content: string;
  readonly hash: string;
  readonly language: string;
  readonly path: string;
  readonly size: number;
}

interface GitHubTreeEntry {
  readonly path?: string;
  readonly sha?: string;
  readonly size?: number;
  readonly type?: string;
}

function base64Url(value: string | Uint8Array): string {
  return Buffer.from(value)
    .toString("base64")
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replace(/=+$/, "");
}

function githubAppJwt(): string {
  const appId = process.env.GITHUB_APP_ID?.trim();
  const privateKey = process.env.GITHUB_APP_PRIVATE_KEY?.replaceAll(
    "\\n",
    "\n",
  ).trim();
  if (!appId || !privateKey) {
    throw new Error("GitHub App credentials are not configured");
  }
  const now = Math.floor(Date.now() / 1000);
  const header = base64Url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const payload = base64Url(
    JSON.stringify({ exp: now + 9 * 60, iat: now - 60, iss: appId }),
  );
  const input = `${header}.${payload}`;
  const signature = createSign("RSA-SHA256").update(input).sign(privateKey);
  return `${input}.${base64Url(signature)}`;
}

async function githubRequest<T>(
  path: string,
  options: {
    readonly body?: unknown;
    readonly method?: "GET" | "POST" | "PUT";
    readonly token?: string | null;
  } = {},
): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...(options.body === undefined
      ? {}
      : { body: JSON.stringify(options.body) }),
    headers: {
      accept: "application/vnd.github+json",
      ...(options.body === undefined
        ? {}
        : { "content-type": "application/json" }),
      ...(options.token ? { authorization: `Bearer ${options.token}` } : {}),
      "user-agent": "UseKratose/1.0",
      "x-github-api-version": API_VERSION,
    },
    method: options.method ?? "GET",
    signal: AbortSignal.timeout(20_000),
  });
  if (!response.ok) {
    const failure = (await response.json().catch(() => null)) as {
      readonly message?: string;
    } | null;
    throw new Error(
      failure?.message ?? `GitHub returned HTTP ${response.status}`,
    );
  }
  return (await response.json()) as T;
}

export function parseGitHubRepositoryUrl(
  rawUrl: string,
): GitHubRepositoryReference {
  const url = new URL(rawUrl);
  if (url.protocol !== "https:" || url.hostname !== "github.com") {
    throw new Error("Repository must be an https://github.com URL");
  }
  const segments = url.pathname.replace(/\/$/, "").split("/").filter(Boolean);
  if (segments.length !== 2) {
    throw new Error("Repository URL must identify one GitHub repository");
  }
  const owner = segments[0];
  const name = segments[1]?.replace(/\.git$/, "");
  if (!owner || !name || !/^[A-Za-z0-9_.-]+$/.test(owner + name)) {
    throw new Error("Repository owner or name is invalid");
  }
  return { name, owner, url: `https://github.com/${owner}/${name}` };
}

export async function getGitHubInstallationToken(
  installationId: string,
): Promise<string> {
  if (!/^\d+$/.test(installationId)) {
    throw new Error("GitHub installation ID is invalid");
  }
  const result = await githubRequest<{ readonly token: string }>(
    `/app/installations/${installationId}/access_tokens`,
    { method: "POST", token: githubAppJwt() },
  );
  return result.token;
}

function sourceLanguage(path: string): string {
  if (path.endsWith(".rs")) return "rust";
  if (path.endsWith(".json")) return "json";
  if (path.endsWith(".toml")) return "toml";
  return "text";
}

function acceptedSourcePath(path: string): boolean {
  return (
    path.endsWith(".rs") ||
    path.endsWith("Anchor.toml") ||
    path.endsWith("Cargo.toml") ||
    path.endsWith("Cargo.lock")
  );
}

function encodedRepositoryPath(reference: GitHubRepositoryReference): string {
  return `${encodeURIComponent(reference.owner)}/${encodeURIComponent(reference.name)}`;
}

export async function retrieveGitHubSource(input: {
  readonly installationId?: string | null;
  readonly repository: GitHubRepositoryReference;
  readonly revision?: string | null;
}): Promise<{
  readonly baseBranch: string;
  readonly files: readonly RetrievedSourceFile[];
  readonly revision: string;
}> {
  const token = input.installationId
    ? await getGitHubInstallationToken(input.installationId)
    : null;
  const repoPath = encodedRepositoryPath(input.repository);
  const repository = await githubRequest<{
    readonly default_branch: string;
  }>(`/repos/${repoPath}`, { token });
  const requestedRevision = input.revision?.trim() || repository.default_branch;
  const commit = await githubRequest<{ readonly sha: string }>(
    `/repos/${repoPath}/commits/${encodeURIComponent(requestedRevision)}`,
    { token },
  );
  const tree = await githubRequest<{
    readonly tree: readonly GitHubTreeEntry[];
    readonly truncated: boolean;
  }>(`/repos/${repoPath}/git/trees/${commit.sha}?recursive=1`, { token });
  if (tree.truncated) throw new Error("GitHub source tree is too large");
  const entries = tree.tree
    .filter(
      (entry) =>
        entry.type === "blob" &&
        entry.path !== undefined &&
        entry.sha !== undefined &&
        acceptedSourcePath(entry.path) &&
        (entry.size ?? 0) <= MAX_FILE_BYTES,
    )
    .slice(0, MAX_FILES);
  const files: RetrievedSourceFile[] = [];
  let totalBytes = 0;
  for (const entry of entries) {
    const blob = await githubRequest<{
      readonly content: string;
      readonly encoding: string;
      readonly sha: string;
      readonly size: number;
    }>(`/repos/${repoPath}/git/blobs/${entry.sha}`, { token });
    if (blob.encoding !== "base64") continue;
    const bytes = Buffer.from(blob.content.replaceAll("\n", ""), "base64");
    totalBytes += bytes.byteLength;
    if (totalBytes > MAX_TOTAL_BYTES) break;
    files.push({
      content: new TextDecoder("utf-8", { fatal: true }).decode(bytes),
      hash: `github:${blob.sha}`,
      language: sourceLanguage(entry.path ?? ""),
      path: entry.path ?? "",
      size: blob.size,
    });
  }
  return {
    baseBranch: repository.default_branch,
    files,
    revision: commit.sha,
  };
}

export async function applyGitHubPatches(input: {
  readonly analysisId: string;
  readonly baseBranch: string;
  readonly findingId: string;
  readonly installationId: string;
  readonly patches: readonly {
    readonly after: string;
    readonly before: string;
    readonly path: string;
  }[];
  readonly repository: GitHubRepositoryReference;
}): Promise<{ readonly branchName: string; readonly pullRequestUrl: string }> {
  const token = await getGitHubInstallationToken(input.installationId);
  const repoPath = encodedRepositoryPath(input.repository);
  const base = await githubRequest<{
    readonly object: { readonly sha: string };
  }>(
    `/repos/${repoPath}/git/ref/heads/${encodeURIComponent(input.baseBranch)}`,
    { token },
  );
  const branchName = `usekratose/fix-${input.analysisId.slice(0, 8)}-${input.findingId.replace(/[^A-Za-z0-9-]/g, "-")}`;
  await githubRequest(`/repos/${repoPath}/git/refs`, {
    body: { ref: `refs/heads/${branchName}`, sha: base.object.sha },
    method: "POST",
    token,
  });
  const byPath = new Map<string, typeof input.patches>();
  for (const patch of input.patches) {
    byPath.set(patch.path, [...(byPath.get(patch.path) ?? []), patch]);
  }
  for (const [path, patches] of byPath) {
    const encodedPath = path.split("/").map(encodeURIComponent).join("/");
    const file = await githubRequest<{
      readonly content: string;
      readonly encoding: string;
      readonly sha: string;
    }>(
      `/repos/${repoPath}/contents/${encodedPath}?ref=${encodeURIComponent(branchName)}`,
      { token },
    );
    if (file.encoding !== "base64") {
      throw new Error(`GitHub did not return ${path} as base64 content`);
    }
    const current = Buffer.from(
      file.content.replaceAll("\n", ""),
      "base64",
    ).toString("utf8");
    const updated = applyGroundedPatches(current, patches);
    await githubRequest(`/repos/${repoPath}/contents/${encodedPath}`, {
      body: {
        branch: branchName,
        content: Buffer.from(updated).toString("base64"),
        message: `fix: apply UseKratose finding ${input.findingId}`,
        sha: file.sha,
      },
      method: "PUT",
      token,
    });
  }
  const pull = await githubRequest<{ readonly html_url: string }>(
    `/repos/${repoPath}/pulls`,
    {
      body: {
        base: input.baseBranch,
        body: `Reviewable patch generated from UseKratose analysis ${input.analysisId}. No deployment was performed.`,
        head: branchName,
        title: `UseKratose security fix: ${input.findingId}`,
      },
      method: "POST",
      token,
    },
  );
  return { branchName, pullRequestUrl: pull.html_url };
}
