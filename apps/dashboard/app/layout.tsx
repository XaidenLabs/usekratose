import type { Metadata } from "next";

import "./globals.css";

export const metadata: Metadata = {
  description: "UseKratose continuous Solana program security console.",
  title: { default: "UseKratose Console", template: "%s — UseKratose" },
};

export default function RootLayout({ children }: { readonly children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body>{children}</body>
    </html>
  );
}
