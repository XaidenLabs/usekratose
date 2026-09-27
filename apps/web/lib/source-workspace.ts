import { createHash } from "node:crypto";

import { createClient } from "@supabase/supabase-js";
import type {
  PostgresProgramStore,
  ProgramSourceWorkspace,
} from "@usekratose/database";

import { retrieveGitHubSource } from "./github-source";

export const PROGRAM_ARTIFACT_BUCKET = "program-artifacts";
export const MAX_SOURCE_FILE_BYTES = 100_000;
export const MAX_SOURCE_TOTAL_BYTES = 750_000;

export function sha256(value: Uint8Array | string): string {
  return `sha256:${createHash("sha256").update(value).digest("hex")}`;
}

export function normalizeSourcePath(value: string): string {
  const path = value.replaceAll("\\", "/").replace(/^\/+/, "");
  if (
    path === "" ||
    path.includes("..") ||
    path.startsWith(".") ||
    !/^[A-Za-z0-9_./-]+$/.test(path)
  ) {
    throw new Error("Source file path is invalid");
  }
  return path;
}

export function sourceLanguage(path: string): string {
  if (path.endsWith(".rs")) return "rust";
  if (path.endsWith(".json")) return "json";
  if (path.endsWith(".toml")) return "toml";
  return "text";
}

export function bearerToken(request: Request): string | null {
  const authorization = request.headers.get("authorization");
  const [scheme, token] = authorization?.split(" ", 2) ?? [];
  return scheme?.toLowerCase() === "bearer" && token ? token : null;
}

function userSupabase(token: string) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !publishableKey) {
    throw new Error("Supabase environment variables are not configured");
  }
  return createClient(url, publishableKey, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { headers: { authorization: `Bearer ${token}` } },
  });
}

export async function downloadArtifact(
  token: string,
  objectPath: string,
): Promise<Uint8Array> {
  const { data, error } = await userSupabase(token)
    .storage.from(PROGRAM_ARTIFACT_BUCKET)
    .download(objectPath);
  if (error) throw new Error(`Artifact download failed: ${error.message}`);
  return new Uint8Array(await data.arrayBuffer());
}

export async function overwriteArtifact(
  token: string,
  objectPath: string,
  content: string,
): Promise<void> {
  const { error } = await userSupabase(token)
    .storage.from(PROGRAM_ARTIFACT_BUCKET)
    .update(objectPath, content, {
      cacheControl: "0",
      contentType: "text/plain",
      upsert: false,
    });
  if (error) throw new Error(`Artifact update failed: ${error.message}`);
}

export async function loadSourceEvidence(
  store: PostgresProgramStore,
  workspace: ProgramSourceWorkspace,
  token: string,
): Promise<
  readonly {
    readonly content: string;
    readonly hash: string;
    readonly path: string;
  }[]
> {
  if (workspace.provider === "github") {
    if (!workspace.repositoryOwner || !workspace.repositoryName) return [];
    const source = await retrieveGitHubSource({
      installationId: workspace.githubInstallationId,
      repository: {
        name: workspace.repositoryName,
        owner: workspace.repositoryOwner,
        url: workspace.repositoryUrl ?? "",
      },
      revision: workspace.revision,
    });
    return source.files.map(({ content, hash, path }) => ({
      content,
      hash,
      path,
    }));
  }

  const files = [];
  let totalBytes = 0;
  for (const file of workspace.files) {
    if (!file.objectPath || file.size > MAX_SOURCE_FILE_BYTES) continue;
    const bytes = await downloadArtifact(token, file.objectPath);
    totalBytes += bytes.byteLength;
    if (totalBytes > MAX_SOURCE_TOTAL_BYTES) break;
    const content = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    if (sha256(bytes) !== file.sourceHash) {
      throw new Error(`Stored source hash mismatch for ${file.path}`);
    }
    files.push({ content, hash: file.sourceHash, path: file.path });
  }
  return files;
}
