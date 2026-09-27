"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import type { Cluster } from "@usekratose/core";

export function MonitorForm({
  defaultCluster,
}: {
  readonly defaultCluster: Cluster;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    const data = new FormData(event.currentTarget);
    const address = String(data.get("address") ?? "");
    const network = String(data.get("network") ?? defaultCluster);
    const response = await fetch("/api/v1/onboarding/program", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
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
    router.push(`/program/${address}`);
    router.refresh();
  }

  return (
    <form className="monitor-card" onSubmit={submit}>
      <div className="card-label">Program details</div>
      <label>
        Program address
        <input
          name="address"
          placeholder="Enter a base58 program address"
          required
          minLength={32}
          maxLength={44}
        />
      </label>
      <label>
        Network
        <select name="network" defaultValue={defaultCluster}>
          <option value="devnet">Devnet</option>
          <option value="mainnet-beta">Mainnet beta</option>
        </select>
      </label>
      {error === null ? null : <p className="form-error">{error}</p>}
      <button className="button" disabled={pending} type="submit">
        {pending ? "Establishing baseline…" : "Start monitoring →"}
      </button>
      <p className="form-footnote">
        Read-only monitoring. UseKratose never needs your upgrade authority or
        wallet secret.
      </p>
    </form>
  );
}
