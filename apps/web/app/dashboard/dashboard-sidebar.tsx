"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { BrandLogo } from "@/components/brand-logo";

import { AuthHeader, type UserInfo } from "../auth-header";

const navigation = [
  { href: "/dashboard", label: "Console", mark: "C" },
  { href: "/dashboard/monitor", label: "Monitor", mark: "M" },
  { href: "/dashboard/alerts", label: "Alerts", mark: "A" },
  { href: "/dashboard/api", label: "API", mark: "↗" },
  { href: "/dashboard/docs", label: "Docs", mark: "D" },
] as const;

function isActive(pathname: string, href: string) {
  return href === "/dashboard"
    ? pathname === href
    : pathname === href || pathname.startsWith(`${href}/`);
}

export function DashboardSidebar({
  healthyPrograms,
  projectName,
  totalPrograms,
  user,
}: {
  readonly healthyPrograms: number;
  readonly projectName: string;
  readonly totalPrograms: number;
  readonly user: UserInfo;
}) {
  const pathname = usePathname();

  return (
    <aside className="dashboard-sidebar">
      <Link className="brand dashboard-brand" href="/dashboard">
        <BrandLogo />
        <span>UseKratose</span>
      </Link>
      <div className="dashboard-project">
        <span>Workspace</span>
        <strong>{projectName}</strong>
      </div>
      <nav aria-label="Dashboard navigation">
        {navigation.map((item) => (
          <Link
            aria-current={isActive(pathname, item.href) ? "page" : undefined}
            className={isActive(pathname, item.href) ? "active" : undefined}
            href={item.href}
            key={item.href}
          >
            <span aria-hidden="true">{item.mark}</span>
            {item.label}
          </Link>
        ))}
      </nav>
      <div className="dashboard-sidebar-footer">
        <div className="sidebar-health">
          <span className="pulse" />
          <span>
            {healthyPrograms}/{totalPrograms} programs healthy
          </span>
        </div>
        <div className="sidebar-user">
          <span>{user.email}</span>
          <AuthHeader user={user} />
        </div>
      </div>
    </aside>
  );
}
