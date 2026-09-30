"use client";

import { useState, type FormEvent } from "react";
import { LoaderCircle, RadioTower } from "lucide-react";

import { dashboardPath } from "@/lib/paths";

export function NewProgramForm({
  onCancel,
  onSuccess,
}: {
  readonly onCancel: () => void;
  readonly onSuccess: () => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    const form = new FormData(event.currentTarget);
    const response = await fetch(dashboardPath("/api/programs"), {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        address: form.get("address"),
        name: form.get("name"),
        network: form.get("network"),
      }),
    });
    const body = (await response.json().catch(() => null)) as {
      readonly error?: { readonly message?: string };
    } | null;
    if (!response.ok) {
      setError(
        body?.error?.message ?? `Monitoring failed (${response.status})`,
      );
      setPending(false);
      return;
    }
    onSuccess();
  }

  return (
    <form onSubmit={submit}>
      <label>
        Program name
        <input
          name="name"
          minLength={1}
          maxLength={80}
          placeholder="e.g. Treasury Program"
          required
        />
      </label>
      <label>
        Program address
        <input
          name="address"
          minLength={32}
          maxLength={44}
          placeholder="Enter a base58 Solana program address"
          required
        />
      </label>
      <label>
        Network
        <select name="network" defaultValue="devnet">
          <option value="devnet">Devnet</option>
          <option value="mainnet-beta">Mainnet beta</option>
        </select>
      </label>
      {error === null ? null : <p className="form-error">{error}</p>}
      <footer>
        <button
          className="secondary-button"
          disabled={pending}
          onClick={onCancel}
          type="button"
        >
          Cancel
        </button>
        <button className="primary-button" disabled={pending} type="submit">
          {pending ? (
            <LoaderCircle className="spin" size={16} />
          ) : (
            <RadioTower size={16} />
          )}
          {pending ? "Establishing baseline…" : "Start monitoring"}
        </button>
      </footer>
    </form>
  );
}
