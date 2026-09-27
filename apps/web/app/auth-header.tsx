"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

import { getSupabaseBrowserClient } from "@/lib/supabase-browser";

export interface UserInfo {
  email: string;
  initials: string;
}

export function AuthHeader({
  user: initialUser,
}: {
  readonly user: UserInfo | null;
}) {
  const dashboardUrl =
    process.env.NEXT_PUBLIC_DASHBOARD_URL ?? "http://localhost:3001";
  const router = useRouter();
  const [user, setUser] = useState<UserInfo | null>(initialUser);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();

    // Listen for auth state changes (e.g. sign out)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT" || !session) {
        setUser(null);
      } else if (session.user.email) {
        const initials = (session.user.email.split("@")[0] ?? "U")
          .slice(0, 2)
          .toUpperCase();
        setUser({ email: session.user.email, initials });
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  async function handleSignOut() {
    const supabase = getSupabaseBrowserClient();
    await supabase.auth.signOut();
    setUser(null);
    setMenuOpen(false);
    router.push("/");
    router.refresh();
  }

  if (!user) {
    return (
      <div className="header-auth">
        <Link className="text-link-nav" href={`${dashboardUrl}/login`}>
          Sign in
        </Link>
        <Link className="button button-small" href={`${dashboardUrl}/signup`}>
          Get started
        </Link>
      </div>
    );
  }

  return (
    <div className="header-auth">
      <button
        className="user-avatar"
        onClick={() => setMenuOpen((o) => !o)}
        type="button"
      >
        {user.initials}
      </button>
      {menuOpen && (
        <>
          <div className="menu-overlay" onClick={() => setMenuOpen(false)} />
          <div className="user-menu">
            <div className="user-menu-info">
              <span className="user-menu-email">{user.email}</span>
            </div>
            <div className="user-menu-divider" />
            <Link
              className="user-menu-item"
              href={`${dashboardUrl}/overview`}
              onClick={() => setMenuOpen(false)}
            >
              Security console
            </Link>
            <Link
              className="user-menu-item"
              href={`${dashboardUrl}/programs?add=1`}
              onClick={() => setMenuOpen(false)}
            >
              Monitor program
            </Link>
            <div className="user-menu-divider" />
            <button
              className="user-menu-item user-menu-signout"
              onClick={handleSignOut}
              type="button"
            >
              Sign out
            </button>
          </div>
        </>
      )}
    </div>
  );
}
