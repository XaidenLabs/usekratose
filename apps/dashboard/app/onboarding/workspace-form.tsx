"use client";

import { LoaderCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { dashboardPath } from "@/lib/paths";

export function WorkspaceForm({
  suggestedName,
}: {
  readonly suggestedName: string;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setPending(true);
    const form = new FormData(event.currentTarget);
    const response = await fetch(dashboardPath("/api/workspace"), {
      body: JSON.stringify({ name: form.get("name") }),
      headers: { "content-type": "application/json" },
      method: "POST",
    });
    const body = (await response.json().catch(() => null)) as {
      readonly error?: { readonly message?: string };
    } | null;
    if (!response.ok) {
      setError(body?.error?.message ?? "Unable to create workspace");
      setPending(false);
      return;
    }
    router.replace("/overview");
    router.refresh();
  }

  return (
    <div className="login-card">
      <div>
        <span className="eyebrow">Workspace setup</span>
        <h2>Choose a workspace name</h2>
        <p>You can immediately add your first Solana program after setup.</p>
      </div>
      <form onSubmit={submit}>
        <label>
          Workspace name
          <input
            defaultValue={suggestedName}
            maxLength={100}
            minLength={1}
            name="name"
            required
          />
        </label>
        {error === null ? null : <p className="form-error">{error}</p>}
        <button className="primary-button" disabled={pending} type="submit">
          {pending ? <LoaderCircle className="spin" size={16} /> : null}
          {pending ? "Creating workspace…" : "Create workspace"}
        </button>
      </form>
    </div>
  );
}
