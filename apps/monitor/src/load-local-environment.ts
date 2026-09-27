import { existsSync } from "node:fs";
import { loadEnvFile } from "node:process";
import { resolve } from "node:path";

export function loadLocalEnvironment(): void {
  for (const candidate of [".env.local", "../../.env.local", ".env"]) {
    const path = resolve(candidate);
    if (existsSync(path)) {
      loadEnvFile(path);
      return;
    }
  }
}
