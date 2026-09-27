# UseKratose Anchor upgrade fixture

This isolated Anchor workspace provides a deterministic devnet program for
validating UseKratose monitoring.

- Version 1 exposes `initializeVault`, `deposit`, and `withdraw`.
- Building with the `v2` feature adds a deliberately unsafe
  `emergencyWithdraw` instruction that writes to the vault PDA without checking
  the vault authority. This devnet-only defect exists solely to demonstrate
  deterministic security detection and evidence-guided explanation.
- Building with the `v3` feature keeps `emergencyWithdraw` but requires the
  vault authority signer and enforces the stored authority relationship. This
  creates a deterministic remediation upgrade for continuity testing.
- The program keypair lives under the ignored `target/deploy` directory.
- `Anchor.toml` pins devnet and never inherits the global mainnet CLI setting.

Build and test version 1:

```bash
NO_DNA=1 ~/.avm/bin/anchor-1.2.0 build --tools-version v1.52 --arch v2
NO_DNA=1 ~/.avm/bin/anchor-1.2.0 test --skip-build --skip-deploy
```

Build version 2 later:

```bash
NO_DNA=1 ~/.avm/bin/anchor-1.2.0 build \
  --tools-version v1.52 \
  --arch v2 \
  -- \
  --features v2
```

Build the secured version 3:

```bash
NO_DNA=1 ~/.avm/bin/anchor-1.2.0 build \
  --tools-version v1.52 \
  --arch v2 \
  -- \
  --features v3
```

The v1.52 platform tools are pinned because their macOS linker remains
compatible with the Monterey build host. SBPF v2 is the newest architecture
supported by that linker and the installed LiteSVM test runtime.

Never reuse the v2 fixture in a production program. Its missing authorization
check is intentional.
