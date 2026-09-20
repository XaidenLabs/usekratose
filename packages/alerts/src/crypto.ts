import {
  createCipheriv,
  createDecipheriv,
  createHmac,
  randomBytes,
  timingSafeEqual,
} from "node:crypto";

function encryptionKey(value: string): Buffer {
  const key = Buffer.from(value, "base64");
  if (key.length !== 32) {
    throw new Error("ALERT_SECRET_ENCRYPTION_KEY must be 32-byte base64");
  }
  return key;
}

export function encryptSecret(secret: string, keyValue: string): string {
  const nonce = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(keyValue), nonce);
  const ciphertext = Buffer.concat([
    cipher.update(secret, "utf8"),
    cipher.final(),
  ]);
  return [
    "v1",
    nonce.toString("base64url"),
    cipher.getAuthTag().toString("base64url"),
    ciphertext.toString("base64url"),
  ].join(".");
}

export function decryptSecret(ciphertext: string, keyValue: string): string {
  const [version, nonceValue, tagValue, encryptedValue] = ciphertext.split(".");
  if (
    version !== "v1" ||
    nonceValue === undefined ||
    tagValue === undefined ||
    encryptedValue === undefined
  ) {
    throw new Error("Invalid encrypted alert secret");
  }
  const decipher = createDecipheriv(
    "aes-256-gcm",
    encryptionKey(keyValue),
    Buffer.from(nonceValue, "base64url"),
  );
  decipher.setAuthTag(Buffer.from(tagValue, "base64url"));
  return Buffer.concat([
    decipher.update(Buffer.from(encryptedValue, "base64url")),
    decipher.final(),
  ]).toString("utf8");
}

export function signWebhook(
  body: string,
  timestamp: number,
  secret: string,
): string {
  const digest = createHmac("sha256", secret)
    .update(`${timestamp}.${body}`)
    .digest("hex");
  return `t=${timestamp},v1=${digest}`;
}

export function verifyWebhookSignature(input: {
  readonly body: string;
  readonly now?: number;
  readonly secret: string;
  readonly signature: string;
  readonly toleranceSeconds?: number;
}): boolean {
  const fields = Object.fromEntries(
    input.signature.split(",").map((field) => field.split("=", 2)),
  );
  const timestamp = Number(fields.t);
  const signature = fields.v1;
  if (!Number.isSafeInteger(timestamp) || signature === undefined) return false;
  const now = input.now ?? Math.floor(Date.now() / 1000);
  if (Math.abs(now - timestamp) > (input.toleranceSeconds ?? 300)) return false;
  const expected = signWebhook(input.body, timestamp, input.secret).split(
    "v1=",
  )[1];
  if (expected === undefined) return false;
  const left = Buffer.from(signature, "hex");
  const right = Buffer.from(expected, "hex");
  return left.length === right.length && timingSafeEqual(left, right);
}

export function assertSafeWebhookUrl(value: string): URL {
  const url = new URL(value);
  if (url.protocol !== "https:") {
    throw new Error("Webhook destinations must use HTTPS");
  }
  const hostname = url.hostname.toLowerCase();
  const blocked =
    hostname === "localhost" ||
    hostname === "0.0.0.0" ||
    hostname === "::1" ||
    hostname.endsWith(".local") ||
    /^127\./.test(hostname) ||
    /^10\./.test(hostname) ||
    /^192\.168\./.test(hostname) ||
    /^169\.254\./.test(hostname) ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(hostname);
  if (blocked) throw new Error("Private webhook destinations are not allowed");
  url.username = "";
  url.password = "";
  return url;
}
