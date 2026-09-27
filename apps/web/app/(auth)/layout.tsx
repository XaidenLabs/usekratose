import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  description:
    "Sign in to UseKratose — continuous Solana security verification.",
  title: {
    default: "Sign in — UseKratose",
    template: "%s — UseKratose",
  },
};

export default function AuthLayout({
  children,
}: {
  readonly children: React.ReactNode;
}) {
  return <div className="auth-shell">{children}</div>;
}
