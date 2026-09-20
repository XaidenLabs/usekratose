import { describe, expect, it } from "vitest";

import { ApiKeyService } from "../src/api-access.js";
import type { ApiAccessStore, ApiKeyRecord } from "../src/ports.js";

class FakeApiStore implements ApiAccessStore {
  public allowed = true;
  public readonly keys = new Map<string, ApiKeyRecord>();
  public readonly logs: string[] = [];

  public async consumeRateLimit(): Promise<{
    readonly allowed: boolean;
    readonly remaining: number;
  }> {
    return { allowed: this.allowed, remaining: this.allowed ? 4 : 0 };
  }

  public async createApiKey(input: {
    readonly keyHash: string;
    readonly keyPrefix: string;
    readonly name: string;
    readonly projectId: string;
  }): Promise<ApiKeyRecord> {
    const record: ApiKeyRecord = {
      id: "key-id",
      keyPrefix: input.keyPrefix,
      name: input.name,
      projectId: input.projectId,
      revokedAt: null,
    };
    this.keys.set(input.keyHash, record);
    return record;
  }

  public async findApiKeyByHash(keyHash: string): Promise<ApiKeyRecord | null> {
    return this.keys.get(keyHash) ?? null;
  }

  public async logApiRequest(input: {
    readonly requestId: string;
  }): Promise<void> {
    this.logs.push(input.requestId);
  }

  public async revokeApiKey(apiKeyId: string): Promise<boolean> {
    for (const [hash, record] of this.keys) {
      if (record.id === apiKeyId) {
        this.keys.set(hash, { ...record, revokedAt: new Date() });
        return true;
      }
    }
    return false;
  }

  public async touchApiKey(): Promise<void> {}
}

describe("Milestone 5 API access", () => {
  it("returns a raw key once and authenticates its hash", async () => {
    const store = new FakeApiStore();
    const service = new ApiKeyService(
      store,
      "a-production-length-api-key-pepper-value",
      { now: () => new Date("2026-09-20T12:00:00Z") },
      5,
    );
    const created = await service.create({ name: "CI", projectId: "demo" });
    expect(created.key).toMatch(/^uk_[a-f0-9]{10}_[A-Za-z0-9_-]{43}$/);
    await expect(service.authenticate(created.key)).resolves.toMatchObject({
      key: { projectId: "demo", rateLimitRemaining: 4 },
      kind: "authenticated",
    });
    await expect(service.authenticate("invalid")).resolves.toEqual({
      kind: "invalid",
    });
  });

  it("rejects revoked keys", async () => {
    const store = new FakeApiStore();
    const service = new ApiKeyService(
      store,
      "a-production-length-api-key-pepper-value",
    );
    const created = await service.create({ name: "CI", projectId: "demo" });
    await service.revoke(created.id, "demo");
    await expect(service.authenticate(created.key)).resolves.toEqual({
      kind: "invalid",
    });
  });

  it("returns an explicit rate-limit result", async () => {
    const store = new FakeApiStore();
    const service = new ApiKeyService(
      store,
      "a-production-length-api-key-pepper-value",
    );
    const created = await service.create({ name: "CI", projectId: "demo" });
    store.allowed = false;
    await expect(service.authenticate(created.key)).resolves.toMatchObject({
      kind: "rate_limited",
    });
  });
});
