"use client";

import { useState, type FormEvent } from "react";
import type { Cluster } from "@usekratose/core";

interface ProgramStepProps {
  readonly defaultCluster: Cluster;
  readonly onComplete: (address: string) => void;
  readonly onSkip: () => void;
}

export function ProgramStep({
  defaultCluster,
  onComplete,
  onSkip,
}: ProgramStepProps) {
  const [address, setAddress] = useState("");
  const [network, setNetwork] = useState<Cluster>(defaultCluster);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);

    try {
      const response = await fetch("/api/v1/onboarding/program", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ address, network }),
      });

      const body = (await response.json().catch(() => ({}))) as {
        error?: { message?: string };
      };

      if (!response.ok) {
        setError(body.error?.message ?? `Request failed (${response.status})`);
        setPending(false);
        return;
      }

      onComplete(address);
    } catch {
      setError("Something went wrong. Please try again.");
      setPending(false);
    }
  }

  return (
    <div className="onboarding-step">
      <div className="step-header">
        <span className="step-number">02</span>
        <h2>Monitor your first program</h2>
        <p>
          Enter a Solana program address to establish its deployment baseline.
          UseKratose will resolve ProgramData, fingerprint executable bytes, and
          begin watching for transitions.
        </p>
      </div>
      <form className="onboarding-form" onSubmit={handleSubmit}>
        <label>
          Program address
          <input
            name="address"
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Enter a base58 program address"
            required
            minLength={32}
            maxLength={44}
            value={address}
          />
        </label>
        <label>
          Network
          <select
            name="network"
            onChange={(event) => setNetwork(event.target.value as Cluster)}
            value={network}
          >
            <option value="devnet">Devnet</option>
            <option value="mainnet-beta">Mainnet beta</option>
          </select>
        </label>
        {error && <p className="form-error">{error}</p>}
        <div className="step-actions">
          <button
            className="button auth-submit"
            disabled={pending}
            type="submit"
          >
            {pending ? "Establishing baseline…" : "Start monitoring →"}
          </button>
          <button className="text-btn" onClick={onSkip} type="button">
            Skip for now
          </button>
        </div>
      </form>
    </div>
  );
}
