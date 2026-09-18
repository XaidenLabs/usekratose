import bs58 from "bs58";

import {
  PROGRAMDATA_METADATA_SIZE,
  PROGRAM_ACCOUNT_SIZE,
} from "../src/loader-v3.js";

export const PROGRAM_ADDRESS = bs58.encode(new Uint8Array(32).fill(7));
export const PROGRAMDATA_ADDRESS = bs58.encode(new Uint8Array(32).fill(9));
export const AUTHORITY_A = bs58.encode(new Uint8Array(32).fill(11));
export const AUTHORITY_B = bs58.encode(new Uint8Array(32).fill(12));

export function programAccountBytes(): Uint8Array {
  const bytes = Buffer.alloc(PROGRAM_ACCOUNT_SIZE);
  bytes.writeUInt32LE(2, 0);
  Buffer.from(bs58.decode(PROGRAMDATA_ADDRESS)).copy(bytes, 4);
  return bytes;
}

export function programDataBytes(input: {
  readonly authority: string | null;
  readonly executable: readonly number[];
  readonly slot: bigint;
}): Uint8Array {
  const bytes = Buffer.alloc(
    PROGRAMDATA_METADATA_SIZE + input.executable.length,
  );
  bytes.writeUInt32LE(3, 0);
  bytes.writeBigUInt64LE(input.slot, 4);
  bytes[12] = input.authority === null ? 0 : 1;
  if (input.authority !== null) {
    Buffer.from(bs58.decode(input.authority)).copy(bytes, 13);
  }
  Buffer.from(input.executable).copy(bytes, PROGRAMDATA_METADATA_SIZE);
  return bytes;
}
