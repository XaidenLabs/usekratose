import { createHmac, randomBytes } from "node:crypto";

import type { ApiAccessStore, ApiKeyRecord, Clock } from "./ports.js";
import { systemClock } from "./ports.js";

export interface CreatedApiKey extends ApiKeyRecord {
  readonly key: string;
}

export interface AuthenticatedApiKey extends ApiKeyRecord {
  readonly rateLimitRemaining: number;
}

export type ApiAuthenticationResult =
  | { readonly kind: "authenticated"; readonly key: AuthenticatedApiKey }
  | { readonly kind: "invalid" }
  | { readonly kind: "rate_limited"; readonly key: ApiKeyRecord };

export class ApiKeyService {
  public constructor(
    private readonly store: ApiAccessStore,
    private readonly pepper: string,
    private readonly clock: Clock = systemClock,
    private readonly requestsPerMinute = 120,
  ) {
    if (pepper.length < 32) {
      throw new Error("API_KEY_PEPPER must contain at least 32 characters");
    }
  }

  public async create(input: {
    readonly name: string;
    readonly projectId: string;
  }): Promise<CreatedApiKey> {
    const token = randomBytes(32).toString("base64url");
    const keyPrefix = randomBytes(5).toString("hex");
    const key = `uk_${keyPrefix}_${token}`;
    const record = await this.store.createApiKey({
      keyHash: this.hash(key),
      keyPrefix: `uk_${keyPrefix}`,
      name: input.name,
      projectId: input.projectId,
    });
    return { ...record, key };
  }

  public async authenticate(rawKey: string): Promise<ApiAuthenticationResult> {
    if (!/^uk_[a-f0-9]{10}_[A-Za-z0-9_-]{43}$/.test(rawKey)) {
      return { kind: "invalid" };
    }
    const record = await this.store.findApiKeyByHash(this.hash(rawKey));
    if (record === null || record.revokedAt !== null)
      return { kind: "invalid" };
    const now = this.clock.now();
    const windowStartedAt = new Date(now);
    windowStartedAt.setUTCSeconds(0, 0);
    const rateLimit = await this.store.consumeRateLimit({
      apiKeyId: record.id,
      limit: this.requestsPerMinute,
      windowStartedAt,
    });
    if (!rateLimit.allowed) return { key: record, kind: "rate_limited" };
    await this.store.touchApiKey(record.id, now);
    return {
      key: { ...record, rateLimitRemaining: rateLimit.remaining },
      kind: "authenticated",
    };
  }

  public revoke(apiKeyId: string, projectId: string): Promise<boolean> {
    return this.store.revokeApiKey(apiKeyId, projectId);
  }

  private hash(key: string): string {
    return createHmac("sha256", this.pepper).update(key).digest("hex");
  }
}
