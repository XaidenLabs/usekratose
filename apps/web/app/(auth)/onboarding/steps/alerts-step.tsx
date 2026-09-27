"use client";

import { useState, type FormEvent } from "react";

interface AlertsStepProps {
  readonly onComplete: () => void;
  readonly onSkip: () => void;
}

export function AlertsStep({ onComplete, onSkip }: AlertsStepProps) {
  const [webhookUrl, setWebhookUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [signingSecret, setSigningSecret] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);

    try {
      const response = await fetch("/api/v1/onboarding/alerts", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ webhookUrl }),
      });

      const body = (await response.json().catch(() => ({}))) as {
        error?: { message?: string };
        signingSecret?: string;
      };

      if (!response.ok) {
        setError(body.error?.message ?? `Request failed (${response.status})`);
        setPending(false);
        return;
      }

      if (body.signingSecret !== undefined) {
        setSigningSecret(body.signingSecret);
        setPending(false);
        return;
      }
      onComplete();
    } catch {
      setError("Something went wrong. Please try again.");
      setPending(false);
    }
  }

  if (signingSecret !== null) {
    return (
      <div className="onboarding-step">
        <div className="step-header">
          <span className="step-number">03</span>
          <h2>Save your signing secret</h2>
          <p>
            This secret is shown once. Store it in your webhook receiver&apos;s
            secret manager before continuing.
          </p>
        </div>
        <div className="code-card">
          <code>{signingSecret}</code>
        </div>
        <button
          className="button auth-submit"
          onClick={onComplete}
          type="button"
        >
          I stored the secret →
        </button>
      </div>
    );
  }

  return (
    <div className="onboarding-step">
      <div className="step-header">
        <span className="step-number">03</span>
        <h2>Configure alerts</h2>
        <p>
          Receive signed webhook notifications when security-relevant changes
          are detected. Every alert includes deterministic evidence.
        </p>
      </div>
      <form className="onboarding-form" onSubmit={handleSubmit}>
        <label>
          Webhook URL <span className="optional">(optional)</span>
          <input
            name="webhookUrl"
            onChange={(e) => setWebhookUrl(e.target.value)}
            placeholder="https://your-api.com/webhooks/usekratose"
            type="url"
            value={webhookUrl}
          />
          <small>
            UseKratose will POST signed JSON payloads to this URL whenever a
            security event is detected for your monitored programs.
          </small>
        </label>
        <div className="alert-preview">
          <div className="alert-preview-header">
            <span>Destination preview</span>
          </div>
          <pre>{webhookUrl.length === 0 ? "Not configured" : webhookUrl}</pre>
          <small>
            Payload fields are populated from the real security event and
            snapshot pair at delivery time.
          </small>
        </div>
        {error && <p className="form-error">{error}</p>}
        <div className="step-actions">
          <button
            className="button auth-submit"
            disabled={pending}
            type="submit"
          >
            {pending ? "Saving…" : "Save webhook →"}
          </button>
          <button className="text-btn" onClick={onSkip} type="button">
            Skip for now
          </button>
        </div>
      </form>
    </div>
  );
}
