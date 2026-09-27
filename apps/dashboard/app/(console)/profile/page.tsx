import {
  BadgeCheck,
  CalendarDays,
  KeyRound,
  Mail,
  ShieldCheck,
  UserRound,
} from "lucide-react";

import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { getDashboardData } from "@/lib/backend";
import { formatDate } from "@/lib/format";

import { ProfileEditor } from "./profile-editor";

export default async function ProfilePage() {
  const data = await getDashboardData();
  const profile = data.profile;
  const initials = profile.displayName
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  const activeKeys = data.apiKeys.filter(
    (key) => key.revokedAt === null,
  ).length;
  return (
    <div className="page-stack profile-page">
      <PageHeader
        description="Your identity, workspace membership, and account security."
        eyebrow="Account"
        title="Profile"
      />
      <section className="profile-hero surface">
        <div className="profile-avatar-wrap">
          <span
            className="profile-avatar"
            style={
              profile.avatarUrl === null
                ? undefined
                : { backgroundImage: `url(${profile.avatarUrl})` }
            }
          >
            {profile.avatarUrl === null ? initials : null}
          </span>
          <span className="verified-mark">
            <BadgeCheck size={16} />
          </span>
        </div>
        <div>
          <h2>{profile.displayName}</h2>
          <p>{profile.email}</p>
          <div className="profile-badges">
            <StatusBadge tone="purple">{profile.role}</StatusBadge>
            <StatusBadge tone={profile.emailVerified ? "good" : "warning"}>
              {profile.emailVerified ? "Email verified" : "Email unverified"}
            </StatusBadge>
          </div>
        </div>
        <ProfileEditor
          avatarUrl={profile.avatarUrl}
          displayName={profile.displayName}
        />
      </section>
      <section className="profile-grid">
        <article className="surface profile-details span-two">
          <div className="surface-header">
            <div>
              <h2>Identity</h2>
              <p>Verified information from your Supabase account.</p>
            </div>
          </div>
          <dl className="detail-list">
            <div>
              <dt>
                <UserRound size={15} />
                Display name
              </dt>
              <dd>{profile.displayName}</dd>
            </div>
            <div>
              <dt>
                <Mail size={15} />
                Email address
              </dt>
              <dd>{profile.email}</dd>
            </div>
            <div>
              <dt>
                <ShieldCheck size={15} />
                Workspace role
              </dt>
              <dd>{profile.role}</dd>
            </div>
            <div>
              <dt>
                <CalendarDays size={15} />
                Member since
              </dt>
              <dd>{formatDate(profile.createdAt)}</dd>
            </div>
            <div>
              <dt>
                <KeyRound size={15} />
                Sign-in providers
              </dt>
              <dd>
                {profile.providers.length === 0
                  ? "Email"
                  : profile.providers.join(", ")}
              </dd>
            </div>
            <div>
              <dt>
                <CalendarDays size={15} />
                Last sign in
              </dt>
              <dd>{formatDate(profile.lastSignInAt)}</dd>
            </div>
          </dl>
        </article>
        <aside className="surface profile-status">
          <h2>Account security</h2>
          <div>
            <span
              className={`security-check ${profile.emailVerified ? "complete" : ""}`}
            >
              <ShieldCheck size={16} />
            </span>
            <p>
              <b>Email verification</b>
              <small>
                {profile.emailVerified ? "Confirmed" : "Action required"}
              </small>
            </p>
          </div>
          <div>
            <span
              className={`security-check ${profile.mfaEnabled ? "complete" : ""}`}
            >
              <KeyRound size={16} />
            </span>
            <p>
              <b>Multi-factor authentication</b>
              <small>{profile.mfaEnabled ? "Enabled" : "Not enabled"}</small>
            </p>
          </div>
          <div className="profile-completion">
            <span>
              <b>Security coverage</b>
              <small>
                {profile.emailVerified && profile.mfaEnabled
                  ? "Complete"
                  : "Improve account protection"}
              </small>
            </span>
            <strong>
              {profile.emailVerified && profile.mfaEnabled
                ? "100%"
                : profile.emailVerified
                  ? "50%"
                  : "0%"}
            </strong>
          </div>
        </aside>
      </section>
      <section className="metric-cards profile-metrics">
        <article>
          <span>Workspace</span>
          <strong className="metric-text">{data.workspace.name}</strong>
          <small>{data.workspace.id}</small>
        </article>
        <article>
          <span>Programs</span>
          <strong>{data.programs.length}</strong>
          <small>Attached deployments</small>
        </article>
        <article>
          <span>Active API keys</span>
          <strong>{activeKeys}</strong>
          <small>Project credentials</small>
        </article>
        <article>
          <span>Alert destinations</span>
          <strong>{data.alertDestinations.length}</strong>
          <small>Notification channels</small>
        </article>
      </section>
    </div>
  );
}
