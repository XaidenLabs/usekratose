"use client";

import Link from "next/link";

import { BrandLogo } from "@/components/brand-logo";
import { usePathname } from "next/navigation";

import { AuthHeader, type UserInfo } from "./auth-header";

export function SiteChrome({
  children,
  user,
}: {
  readonly children: React.ReactNode;
  readonly user: UserInfo | null;
}) {
  const pathname = usePathname();

  if (pathname === "/") {
    return <>{children}</>;
  }

  if (pathname.startsWith("/dashboard")) {
    return <main>{children}</main>;
  }

  return (
    <>
      <div className="noise" />
      <header className="site-header">
        <Link className="brand" href="/">
          <BrandLogo />
          <span>UseKratose</span>
        </Link>
        <AuthHeader user={user} />
      </header>
      <main>{children}</main>
      <footer className="site-footer">
        <div>
          <BrandLogo className="small" />
          <strong>UseKratose</strong>
        </div>
        <p>Objective deployment evidence. Continuous Solana verification.</p>
        <span>Built for the Solana ecosystem.</span>
      </footer>
    </>
  );
}
