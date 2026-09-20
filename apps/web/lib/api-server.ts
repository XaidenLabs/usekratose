import { randomUUID } from "node:crypto";

import {
  ApiKeyService,
  type AuthenticatedApiKey,
} from "@usekratose/application";
import { type PostgresProgramStore } from "@usekratose/database";

import { createServerDatabase } from "./database";

export interface ApiContext {
  readonly key: AuthenticatedApiKey;
  readonly store: PostgresProgramStore;
}

function bearerToken(request: Request): string | null {
  const authorization = request.headers.get("authorization");
  if (authorization === null) return null;
  const [scheme, token] = authorization.split(" ", 2);
  return scheme?.toLowerCase() === "bearer" && token !== undefined
    ? token
    : null;
}

export async function withApiAuth(
  request: Request,
  handler: (context: ApiContext) => Promise<Response>,
): Promise<Response> {
  const startedAt = performance.now();
  const requestId = request.headers.get("x-request-id") ?? randomUUID();
  const pepper = process.env.API_KEY_PEPPER;
  const database = createServerDatabase();
  if (database === null || pepper === undefined) {
    return Response.json(
      {
        error: {
          code: "CONFIGURATION_ERROR",
          message: "API is not configured",
        },
      },
      { status: 503 },
    );
  }

  let key: AuthenticatedApiKey | null = null;
  let response: Response;
  try {
    const token = bearerToken(request);
    if (token === null) {
      response = Response.json(
        { error: { code: "UNAUTHORIZED", message: "Bearer API key required" } },
        { status: 401 },
      );
    } else {
      const authentication = await new ApiKeyService(
        database.store,
        pepper,
      ).authenticate(token);
      if (authentication.kind === "invalid") {
        response = Response.json(
          { error: { code: "UNAUTHORIZED", message: "Invalid API key" } },
          { status: 401 },
        );
      } else if (authentication.kind === "rate_limited") {
        response = Response.json(
          { error: { code: "RATE_LIMITED", message: "Rate limit exceeded" } },
          { headers: { "retry-after": "60" }, status: 429 },
        );
      } else {
        key = authentication.key;
        response = await handler({ key, store: database.store });
        response.headers.set(
          "x-ratelimit-remaining",
          String(key.rateLimitRemaining),
        );
      }
    }
  } catch (error) {
    console.error("API request failed", { error, requestId });
    response = Response.json(
      { error: { code: "INTERNAL_ERROR", message: "Request failed" } },
      { status: 500 },
    );
  }

  response.headers.set("x-request-id", requestId);
  await database.store
    .logApiRequest({
      apiKeyId: key?.id ?? null,
      durationMs: Math.max(0, Math.round(performance.now() - startedAt)),
      method: request.method,
      path: new URL(request.url).pathname,
      projectId: key?.projectId ?? null,
      requestId,
      statusCode: response.status,
    })
    .catch((error: unknown) =>
      console.error("API request log failed", { error }),
    );
  await database.close();
  return response;
}

export function hasControlPlaneAccess(request: Request): boolean {
  const token = process.env.CONTROL_PLANE_TOKEN;
  return (
    token !== undefined &&
    request.headers.get("authorization") === `Bearer ${token}`
  );
}
