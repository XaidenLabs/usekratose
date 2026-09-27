"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Bell,
  BookOpen,
  Braces,
  ChevronsUpDown,
  CircleUserRound,
  FileClock,
  KeyRound,
  LayoutDashboard,
  LogOut,
  Menu,
  Moon,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  Search,
  Settings,
  ShieldCheck,
  Sun,
  X,
} from "lucide-react";

import { getSupabaseBrowserClient } from "@/lib/supabase-browser";
import type { DashboardProfile } from "@/lib/types";

import { BrandLogo } from "./brand-logo";

const navigation = [
  { href: "/overview", icon: LayoutDashboard, label: "Overview" },
  { href: "/programs", icon: ShieldCheck, label: "Programs" },
  { href: "/events", icon: FileClock, label: "Security events" },
  { href: "/alerts", icon: Bell, label: "Alerts" },
  { href: "/api-keys", icon: KeyRound, label: "API keys" },
] as const;

const accountNavigation = [
  { href: "/docs", icon: BookOpen, label: "Documentation" },
  { href: "/profile", icon: CircleUserRound, label: "Profile" },
  { href: "/settings", icon: Settings, label: "Settings" },
] as const;

function initials(profile: DashboardProfile) {
  return profile.displayName
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function AppShell({
  children,
  profile,
  workspace,
}: {
  readonly children: React.ReactNode;
  readonly profile: DashboardProfile;
  readonly workspace: { readonly id: string; readonly name: string };
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [light, setLight] = useState(false);

  useEffect(() => {
    document.documentElement.classList.toggle("light", light);
    document.documentElement.classList.toggle("dark", !light);
  }, [light]);

  useEffect(() => {
    function handleKeyboard(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setSearchOpen(true);
      }
      if (event.key === "Escape") {
        setProfileOpen(false);
        setSearchOpen(false);
      }
    }
    window.addEventListener("keydown", handleKeyboard);
    return () => window.removeEventListener("keydown", handleKeyboard);
  }, []);

  async function signOut() {
    await getSupabaseBrowserClient().auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  const renderNavigation = (
    items: typeof navigation | typeof accountNavigation,
  ) =>
    items.map((item) => {
      const active =
        pathname === item.href || pathname.startsWith(`${item.href}/`);
      const Icon = item.icon;
      return (
        <Link
          aria-current={active ? "page" : undefined}
          className={`nav-link ${active ? "active" : ""}`}
          href={item.href}
          key={item.href}
          onClick={() => setMobileOpen(false)}
          title={collapsed ? item.label : undefined}
        >
          <Icon size={17} />
          <span>{item.label}</span>
        </Link>
      );
    });

  return (
    <div className={`console-shell ${collapsed ? "sidebar-collapsed" : ""}`}>
      {mobileOpen ? (
        <button
          aria-label="Close navigation"
          className="mobile-overlay"
          onClick={() => setMobileOpen(false)}
        />
      ) : null}
      <aside className={`console-sidebar ${mobileOpen ? "mobile-open" : ""}`}>
        <div className="sidebar-brand-row">
          <Link className="brand" href="/overview">
            <BrandLogo />
            <span>UseKratose</span>
          </Link>
          <button
            className="icon-button mobile-only"
            onClick={() => setMobileOpen(false)}
            type="button"
          >
            <X size={17} />
          </button>
        </div>
        <button className="workspace-switcher" type="button">
          <span className="workspace-avatar">
            {workspace.name.slice(0, 1).toUpperCase()}
          </span>
          <span>
            <b>{workspace.name}</b>
            <small>Security workspace</small>
          </span>
          <ChevronsUpDown size={14} />
        </button>
        <nav className="sidebar-nav" aria-label="Primary navigation">
          <span className="nav-label">Monitor</span>
          {renderNavigation(navigation)}
          <span className="nav-label nav-label-spaced">Account</span>
          {renderNavigation(accountNavigation)}
        </nav>
        <div className="sidebar-footer">
          <Link className="new-program" href="/programs?add=1">
            <Plus size={16} />
            <span>Add program</span>
          </Link>
          <button
            className="collapse-button"
            onClick={() => setCollapsed((value) => !value)}
            type="button"
          >
            {collapsed ? (
              <PanelLeftOpen size={16} />
            ) : (
              <PanelLeftClose size={16} />
            )}
            <span>Collapse sidebar</span>
          </button>
        </div>
      </aside>
      <div className="console-main">
        <header className="console-header">
          <div className="header-left">
            <button
              className="icon-button mobile-only"
              onClick={() => setMobileOpen(true)}
              type="button"
            >
              <Menu size={18} />
            </button>
            <button
              className="search-trigger"
              onClick={() => setSearchOpen(true)}
              type="button"
            >
              <Search size={15} />
              Search navigation <kbd>⌘K</kbd>
            </button>
          </div>
          <div className="header-actions">
            <Link className="icon-button" href="/docs" title="Documentation">
              <BookOpen size={17} />
            </Link>
            <button
              aria-label="Toggle theme"
              className="icon-button"
              onClick={() => setLight((value) => !value)}
              type="button"
            >
              {light ? <Moon size={17} /> : <Sun size={17} />}
            </button>
            <div className="profile-menu-wrap">
              <button
                className="profile-trigger"
                onClick={() => setProfileOpen((value) => !value)}
                type="button"
              >
                <span
                  className="avatar"
                  style={
                    profile.avatarUrl === null
                      ? undefined
                      : { backgroundImage: `url(${profile.avatarUrl})` }
                  }
                >
                  {profile.avatarUrl === null ? initials(profile) : null}
                </span>
                <span>
                  <b>{profile.displayName}</b>
                  <small>{profile.email}</small>
                </span>
                <ChevronsUpDown size={14} />
              </button>
              {profileOpen ? (
                <div className="profile-menu">
                  <Link href="/profile" onClick={() => setProfileOpen(false)}>
                    <CircleUserRound size={15} />
                    View profile
                  </Link>
                  <Link href="/settings" onClick={() => setProfileOpen(false)}>
                    <Settings size={15} />
                    Account settings
                  </Link>
                  <button onClick={signOut} type="button">
                    <LogOut size={15} />
                    Sign out
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        </header>
        <main className="console-content">{children}</main>
      </div>
      {searchOpen ? (
        <div
          className="command-overlay"
          role="presentation"
          onMouseDown={() => setSearchOpen(false)}
        >
          <div
            className="command-dialog"
            role="dialog"
            aria-modal="true"
            aria-label="Search"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div>
              <Search size={17} />
              <input autoFocus placeholder="Search navigation…" />
            </div>
            <span>Quick navigation</span>
            {[...navigation, ...accountNavigation].map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  href={item.href}
                  key={item.href}
                  onClick={() => setSearchOpen(false)}
                >
                  <Icon size={16} />
                  {item.label}
                </Link>
              );
            })}
            <Link href="/docs" onClick={() => setSearchOpen(false)}>
              <Braces size={16} />
              Developer documentation
            </Link>
          </div>
        </div>
      ) : null}
    </div>
  );
}
