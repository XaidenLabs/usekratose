"use client";

import { useState, type FormEvent } from "react";

interface ProjectStepProps {
  readonly onComplete: (projectId: string) => void;
}

export function ProjectStep({ onComplete }: ProjectStepProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);

    try {
      const response = await fetch("/api/v1/onboarding/project", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name, description }),
      });

      const body = (await response.json().catch(() => ({}))) as {
        projectId?: string;
        error?: { message?: string };
      };

      if (!response.ok) {
        setError(body.error?.message ?? `Request failed (${response.status})`);
        setPending(false);
        return;
      }

      onComplete(body.projectId ?? name.toLowerCase().replace(/\s+/g, "-"));
    } catch {
      setError("Something went wrong. Please try again.");
      setPending(false);
    }
  }

  return (
    <div className="onboarding-step">
      <div className="step-header">
        <span className="step-number">01</span>
        <h2>Create your project</h2>
        <p>
          A project is your workspace for monitoring Solana programs. You can
          add team members and configure alerts per project.
        </p>
      </div>
      <form className="onboarding-form" onSubmit={handleSubmit}>
        <label>
          Project name
          <input
            autoFocus
            name="name"
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Acme Protocol"
            required
            value={name}
          />
        </label>
        <label>
          Description <span className="optional">(optional)</span>
          <input
            name="description"
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What does your project do?"
            value={description}
          />
        </label>
        {error && <p className="form-error">{error}</p>}
        <button className="button auth-submit" disabled={pending} type="submit">
          {pending ? "Creating…" : "Create project →"}
        </button>
      </form>
    </div>
  );
}
