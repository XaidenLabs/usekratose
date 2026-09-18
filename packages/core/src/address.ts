import bs58 from "bs58";

import { UseKratoseError } from "./errors.js";

export function assertSolanaAddress(value: string): void {
  let decoded: Uint8Array;

  try {
    decoded = bs58.decode(value);
  } catch (error) {
    throw new UseKratoseError(
      "INVALID_ADDRESS",
      `Invalid Solana address: ${value}`,
      { cause: error },
    );
  }

  if (decoded.length !== 32) {
    throw new UseKratoseError(
      "INVALID_ADDRESS",
      `Solana addresses must decode to 32 bytes; received ${decoded.length}`,
    );
  }
}

export function encodeAddress(bytes: Uint8Array): string {
  if (bytes.length !== 32) {
    throw new UseKratoseError(
      "INVALID_LOADER_STATE",
      `Expected a 32-byte public key; received ${bytes.length}`,
    );
  }

  return bs58.encode(bytes);
}
