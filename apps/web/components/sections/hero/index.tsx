import Link from "next/link";

import { evidencePrinciples } from "@/constants";

const dashboardUrl =
  process.env.NEXT_PUBLIC_DASHBOARD_URL ?? "http://localhost:3001";

export default function Hero() {
  return (
    <section className="brand-hero" id="hero">
      <div aria-hidden="true" className="brand-hero-backdrop" />
      <div className="brand-hero-content">
        <div className="brand-hero-copy">
          <h1>
            <span>Continuous security for every</span>
            <span>Solana deployment</span>
          </h1>
          <p>
            Monitor executable bytes, ProgramData, deployment slots, upgrade
            authority, IDLs, and source references. UseKratose turns every
            observed change into deterministic, reviewable security evidence.
          </p>
          <p className="brand-hero-positioning">
            Certificate transparency and Git-style security diffs for deployed
            Solana programs.
          </p>
          <div className="brand-hero-actions">
            <Link
              className="brand-primary-action"
              href={`${dashboardUrl}/signup`}
            >
              Start monitoring
            </Link>
          </div>
        </div>

        <div
          className="brand-hero-proof"
          aria-label="UseKratose evidence principles"
        >
          {evidencePrinciples.slice(0, 4).map((principle) => (
            <span key={principle}>{principle}</span>
          ))}
        </div>
      </div>
    </section>
  );
}
