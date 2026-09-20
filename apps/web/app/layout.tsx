import type { Metadata } from "next";
import Link from "next/link";

import "./globals.css";

export const metadata: Metadata = {
  description: "Continuous security verification for deployed Solana programs.",
  title: {
    default: "UseKratose — Verify every Solana upgrade",
    template: "%s — UseKratose",
  },
};

export default function RootLayout({
  children,
}: {
  readonly children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <div className="noise" />
        <header className="site-header">
          <Link className="brand" href="/">
            <span className="brand-mark">K</span>
            <span>UseKratose</span>
          </Link>
          <nav>
            <Link href="/dashboard">Console</Link>
            <Link href="/monitor">Monitor</Link>
            <Link href="/dashboard/api">API</Link>
            <Link href="/dashboard/api">Docs</Link>
          </nav>
          <Link className="button button-small" href="/monitor">
            Monitor a program
          </Link>
        </header>
        <main>{children}</main>
        <footer className="site-footer">
          <div>
            <span className="brand-mark small">K</span>
            <strong>UseKratose</strong>
          </div>
          <p>Objective deployment evidence. Continuous Solana verification.</p>
          <span>Built for the Colosseum ecosystem.</span>
        </footer>
      </body>
    </html>
  );
}
