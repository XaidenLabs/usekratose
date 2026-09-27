import type { Metadata } from "next";

import { MonitorForm } from "@/app/monitor/monitor-form";
import { configuredDefaultCluster } from "@/lib/solana-rpc";

export const metadata: Metadata = { title: "Monitor a Program" };

export default function MonitorPage() {
  const defaultCluster = configuredDefaultCluster();

  return (
    <section className="form-page dashboard-page">
      <div className="form-intro">
        <span className="eyebrow">
          <span className="pulse" /> New deployment baseline
        </span>
        <h1>Monitor a Solana program.</h1>
        <p>
          UseKratose resolves the upgradeable loader state, fingerprints the
          executable, records authority and IDL evidence, then watches for every
          future transition.
        </p>
        <ol>
          <li>
            <b>01</b> Resolve ProgramData
          </li>
          <li>
            <b>02</b> Create deterministic snapshot
          </li>
          <li>
            <b>03</b> Begin WebSocket + polling coverage
          </li>
        </ol>
      </div>
      <MonitorForm defaultCluster={defaultCluster} />
    </section>
  );
}
