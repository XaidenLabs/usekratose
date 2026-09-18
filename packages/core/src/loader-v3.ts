import type { AccountRead, ResolvedDeployment } from "./domain.js";
import { encodeAddress } from "./address.js";
import { UseKratoseError } from "./errors.js";

export const UPGRADEABLE_LOADER_ADDRESS =
  "BPFLoaderUpgradeab1e11111111111111111111111";
export const PROGRAM_ACCOUNT_SIZE = 36;
export const PROGRAMDATA_METADATA_SIZE = 45;

const PROGRAM_VARIANT = 2;
const PROGRAMDATA_VARIANT = 3;

export interface FinalizedAccountReader {
  getAccountInfo(address: string): Promise<AccountRead>;
}

function readVariant(data: Uint8Array): number {
  if (data.length < 4) {
    throw new UseKratoseError(
      "INVALID_LOADER_STATE",
      "Upgradeable loader account is shorter than its state discriminator",
    );
  }

  return Buffer.from(data).readUInt32LE(0);
}

export function parseProgramAccount(data: Uint8Array): string {
  if (
    data.length !== PROGRAM_ACCOUNT_SIZE ||
    readVariant(data) !== PROGRAM_VARIANT
  ) {
    throw new UseKratoseError(
      "INVALID_LOADER_STATE",
      "Account is not a valid loader-v3 Program account",
    );
  }

  return encodeAddress(data.slice(4, PROGRAM_ACCOUNT_SIZE));
}

export function parseProgramDataAccount(
  programAddress: string,
  programDataAddress: string,
  programOwner: string,
  data: Uint8Array,
): ResolvedDeployment {
  if (
    data.length < PROGRAMDATA_METADATA_SIZE ||
    readVariant(data) !== PROGRAMDATA_VARIANT
  ) {
    throw new UseKratoseError(
      "INVALID_LOADER_STATE",
      "Account is not a valid loader-v3 ProgramData account",
    );
  }

  const buffer = Buffer.from(data);
  const option = buffer[12];
  if (option !== 0 && option !== 1) {
    throw new UseKratoseError(
      "INVALID_LOADER_STATE",
      `Invalid ProgramData authority option: ${String(option)}`,
    );
  }

  return {
    accountData: data,
    deploymentSlot: buffer.readBigUInt64LE(4),
    executableBytes: data.slice(PROGRAMDATA_METADATA_SIZE),
    programAddress,
    programDataAddress,
    programOwner,
    upgradeAuthority: option === 1 ? encodeAddress(data.slice(13, 45)) : null,
  };
}

export async function resolveLoaderV3Deployment(
  reader: FinalizedAccountReader,
  programAddress: string,
): Promise<{
  readonly deployment: ResolvedDeployment;
  readonly observedSlot: bigint;
}> {
  const programRead = await reader.getAccountInfo(programAddress);
  if (programRead.account === null) {
    throw new UseKratoseError(
      "ACCOUNT_NOT_FOUND",
      `Program account ${programAddress} was not found`,
    );
  }
  if (!programRead.account.executable) {
    throw new UseKratoseError(
      "NOT_EXECUTABLE",
      `Account ${programAddress} is not executable`,
    );
  }
  if (programRead.account.owner !== UPGRADEABLE_LOADER_ADDRESS) {
    throw new UseKratoseError(
      "UNSUPPORTED_LOADER",
      `Program ${programAddress} is not owned by loader-v3`,
    );
  }

  const programDataAddress = parseProgramAccount(programRead.account.data);
  const programDataRead = await reader.getAccountInfo(programDataAddress);
  if (programDataRead.account === null) {
    throw new UseKratoseError(
      "ACCOUNT_NOT_FOUND",
      `ProgramData account ${programDataAddress} was not found`,
    );
  }
  if (programDataRead.account.owner !== UPGRADEABLE_LOADER_ADDRESS) {
    throw new UseKratoseError(
      "INVALID_LOADER_STATE",
      `ProgramData account ${programDataAddress} has an unexpected owner`,
    );
  }
  if (programDataRead.account.executable) {
    throw new UseKratoseError(
      "INVALID_LOADER_STATE",
      `ProgramData account ${programDataAddress} must not be executable`,
    );
  }

  return {
    deployment: parseProgramDataAccount(
      programAddress,
      programDataAddress,
      programRead.account.owner,
      programDataRead.account.data,
    ),
    observedSlot: programDataRead.contextSlot,
  };
}
