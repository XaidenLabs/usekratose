import type { Metadata } from "next";

import "./globals.css";
import { SiteChrome } from "./site-chrome";
import { getSession } from "@/lib/auth";

const developmentServiceWorkerReset = `
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.getRegistrations().then(async (registrations) => {
    const removed = await Promise.all(
      registrations.map((registration) => registration.unregister()),
    );
    if ("caches" in window) {
      const names = await caches.keys();
      await Promise.all(names.map((name) => caches.delete(name)));
    }
    if (removed.some(Boolean) && sessionStorage.getItem("usekratose-sw-reset") !== "done") {
      sessionStorage.setItem("usekratose-sw-reset", "done");
      window.location.reload();
    }
  });
}
`;

export const metadata: Metadata = {
  description: "Continuous security verification for deployed Solana programs.",
  title: {
    default: "UseKratose — Verify every Solana upgrade",
    template: "%s — UseKratose",
  },
};

export default async function RootLayout({
  children,
}: {
  readonly children: React.ReactNode;
}) {
  const session = await getSession();

  const user = session
    ? {
        email: session.email,
        initials: (session.email.split("@")[0] ?? "U")
          .slice(0, 2)
          .toUpperCase(),
      }
    : null;

  return (
    <html lang="en">
      {process.env.NODE_ENV === "development" ? (
        <head>
          <script
            dangerouslySetInnerHTML={{ __html: developmentServiceWorkerReset }}
          />
        </head>
      ) : null}
      <body>
        <SiteChrome user={user}>{children}</SiteChrome>
      </body>
    </html>
  );
}
