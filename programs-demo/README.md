# UseKratose live program fleet

Ten intentionally small, upgradeable Solana programs for exercising UseKratose on devnet. Each program has distinct instruction validation and a `v2` feature that produces a deterministic executable change for later upgrade demonstrations.

These programs hold no user funds and exist only as monitoring fixtures.

## Programs

| Program             | Demonstrated behavior       |
| ------------------- | --------------------------- |
| `heartbeat`         | Health-check instruction    |
| `counter`           | Counter increment payload   |
| `vault-guard`       | Required signer policy      |
| `treasury-guard`    | Writable treasury policy    |
| `oracle-gate`       | Fixed-width price input     |
| `access-guard`      | Admin signer authorization  |
| `emergency-pause`   | Pause/unpause opcodes       |
| `metadata-registry` | UTF-8 metadata validation   |
| `proposal-vote`     | Governance proposal payload |
| `token-policy`      | Mint/burn policy opcodes    |

## Devnet addresses

| Program             | Address                                        |
| ------------------- | ---------------------------------------------- |
| `access-guard`      | `5Vbbg9Yuu7dGdhZyHzwog1EDaMsDXA6vksjjitPX6xGh` |
| `counter`           | `VvxLExv1yYQhTVpyvYCSwDDV9Ab9GqUShcVvB9Da9XY`  |
| `emergency-pause`   | `7yfoVaJNtVC3FiQyw6nS9FoxHY8DQ2VnNYdPcoD7w2y9` |
| `heartbeat`         | `79i2cSiHB7dntj6SCXtcdkAUzZRYJzgKzgbbca2YgNrp` |
| `metadata-registry` | `2u3rpRqLMP8A9C8peWFyX48db881uAxWuiNyyiwyBuys` |
| `oracle-gate`       | `AmCqfqEP2hueeDHNrS1vQab4QkVcJaV6Lr12zhq2HSuu` |
| `proposal-vote`     | `6cwKCtorRRNkKR42c8fn8RsrbEUcBotU19scTz5gg89D` |
| `token-policy`      | `9a86ej1Dyj7SjCnCpL6SiPwKzqvtL5UZqHBL8mdRtXWm` |
| `treasury-guard`    | `6dGHsZ2s5sRUNZ3byRz5JPyipjscBUBJHYqfnUpF5oab` |
| `vault-guard`       | `7h7YhSxMabkGDqDCRgBYnCJUYafPdg4D13BeUqcmW6Uq` |

The addresses become monitorable only after their corresponding binaries are successfully deployed. Public addresses are also available in `programs.json`; private program keypairs remain exclusively in the ignored `.keys/` directory.

Build v1 with `NO_DNA=1 cargo build-sbf --workspace` from this directory. Build a program's upgrade with `NO_DNA=1 cargo build-sbf -p <package> --features v2`.

Program keypairs are generated into `.keys/`, which is intentionally ignored by Git. Never commit or share those keypairs.

## Register the complete fleet

Attach every program in `programs.json` to an existing UseKratose workspace and establish any missing baselines:

```bash
pnpm seed:demo-fleet -- --project <WORKSPACE_PROJECT_ID>
```

The importer is idempotent. Existing snapshots are preserved, missing workspace monitors are attached, human-readable fixture names are applied, and the stored ProgramData address, deployment slot, and executable hash are checked against this manifest.
