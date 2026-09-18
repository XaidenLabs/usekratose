# Upgrade proof program

This intentionally tiny program exists only to prove that UseKratose detects a real loader-v3 upgrade. It has no custody, token, or admin behavior.

Build v1:

```bash
NO_DNA=1 cargo build-sbf --manifest-path programs/demo-upgradeable/Cargo.toml
```

Build v2 with a deterministic binary change:

```bash
NO_DNA=1 cargo build-sbf --manifest-path programs/demo-upgradeable/Cargo.toml --features v2
```

Deployment requires a user-controlled Solana CLI wallet. Use the same program keypair for both deployments; never commit that keypair.
