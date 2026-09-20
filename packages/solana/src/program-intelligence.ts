import {
  DataSource,
  fetchMetadataFromSeeds,
  Format,
  unpackAndFetchExternalData,
  unpackDirectData,
  unpackUrlData,
} from "@solana-program/program-metadata";
import {
  address,
  createSolanaRpc,
  isSolanaError,
  SOLANA_ERROR__ACCOUNTS__ACCOUNT_NOT_FOUND,
} from "@solana/kit";
import type { ProgramIntelligenceGateway } from "@usekratose/application";
import {
  normalizeSourceReference,
  type SnapshotEnrichment,
} from "@usekratose/core";

const MAX_METADATA_BYTES = 1_000_000;
const MAX_REDIRECTS = 2;

interface ProgramMetadataIntelligenceOptions {
  readonly allowedUrlHosts?: readonly string[];
  readonly fetchImplementation?: typeof fetch;
}

type MetadataResult =
  | { readonly kind: "available"; readonly value: unknown }
  | { readonly kind: "error" }
  | { readonly kind: "unavailable" };

function parseMetadata(format: Format, content: string): unknown {
  if (Buffer.byteLength(content, "utf8") > MAX_METADATA_BYTES) {
    throw new Error("Program metadata exceeds the configured size limit");
  }
  if (format !== Format.Json && format !== Format.None) {
    throw new Error("Only JSON Program Metadata is accepted");
  }
  return JSON.parse(content);
}

async function readBoundedResponse(response: Response): Promise<string> {
  if (!response.ok) {
    throw new Error(`Program metadata URL returned HTTP ${response.status}`);
  }
  const declaredLength = response.headers.get("content-length");
  if (
    declaredLength !== null &&
    Number.parseInt(declaredLength, 10) > MAX_METADATA_BYTES
  ) {
    throw new Error("Program metadata URL exceeds the configured size limit");
  }
  if (response.body === null) return "";
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > MAX_METADATA_BYTES) {
      await reader.cancel();
      throw new Error("Program metadata URL exceeds the configured size limit");
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder().decode(bytes);
}

async function fetchAllowlistedUrl(
  rawUrl: string,
  allowedHosts: ReadonlySet<string>,
  fetchImplementation: typeof fetch,
  redirects = 0,
): Promise<string> {
  const url = new URL(rawUrl);
  if (url.protocol !== "https:" || !allowedHosts.has(url.hostname)) {
    throw new Error("Program metadata URL host is not allowlisted");
  }
  const response = await fetchImplementation(url, {
    redirect: "manual",
    signal: AbortSignal.timeout(10_000),
  });
  if (response.status >= 300 && response.status < 400) {
    const location = response.headers.get("location");
    if (location === null || redirects >= MAX_REDIRECTS) {
      throw new Error("Program metadata URL redirect was rejected");
    }
    return fetchAllowlistedUrl(
      new URL(location, url).toString(),
      allowedHosts,
      fetchImplementation,
      redirects + 1,
    );
  }
  return readBoundedResponse(response);
}

export class ProgramMetadataIntelligenceClient implements ProgramIntelligenceGateway {
  private readonly allowedUrlHosts: ReadonlySet<string>;
  private readonly fetchImplementation: typeof fetch;
  private readonly rpc: ReturnType<typeof createSolanaRpc>;

  public constructor(
    endpoint: string,
    options: ProgramMetadataIntelligenceOptions = {},
  ) {
    this.allowedUrlHosts = new Set(options.allowedUrlHosts ?? []);
    this.fetchImplementation = options.fetchImplementation ?? fetch;
    this.rpc = createSolanaRpc(endpoint);
  }

  public async retrieve(programAddress: string): Promise<SnapshotEnrichment> {
    const [idl, metadata] = await Promise.all([
      this.fetchOptionalMetadata(programAddress, "idl"),
      this.fetchOptionalMetadata(programAddress, "security"),
    ]);

    return {
      ...(idl.kind === "error"
        ? {}
        : { idl: idl.kind === "available" ? idl.value : null }),
      ...(metadata.kind === "error"
        ? {}
        : {
            metadata: metadata.kind === "available" ? metadata.value : null,
            source:
              metadata.kind === "available"
                ? normalizeSourceReference(metadata.value)
                : null,
          }),
    };
  }

  private async fetchOptionalMetadata(
    programAddress: string,
    seed: string,
  ): Promise<MetadataResult> {
    try {
      const account = await fetchMetadataFromSeeds(this.rpc, {
        authority: null,
        program: address(programAddress),
        seed,
      });
      const content = await this.unpackMetadata(account.data);
      return {
        kind: "available",
        value: parseMetadata(account.data.format, content),
      };
    } catch (error) {
      return isSolanaError(error, SOLANA_ERROR__ACCOUNTS__ACCOUNT_NOT_FOUND)
        ? { kind: "unavailable" }
        : { kind: "error" };
    }
  }

  private async unpackMetadata(
    input: Parameters<typeof unpackDirectData>[0] & {
      readonly dataSource: DataSource;
    },
  ): Promise<string> {
    if (input.data.byteLength > MAX_METADATA_BYTES) {
      throw new Error(
        "Packed Program Metadata exceeds the configured size limit",
      );
    }
    switch (input.dataSource) {
      case DataSource.Direct:
        return unpackDirectData(input);
      case DataSource.External:
        return unpackAndFetchExternalData({ rpc: this.rpc, ...input });
      case DataSource.Url:
        return fetchAllowlistedUrl(
          unpackUrlData(input),
          this.allowedUrlHosts,
          this.fetchImplementation,
        );
    }
  }
}
