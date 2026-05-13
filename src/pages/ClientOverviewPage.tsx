import { ArrowLeft } from "lucide-react"
import { Link, useParams } from "react-router-dom"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { mockAuthorizations } from "@/data/mockAuthorizations"
import { mockClients } from "@/data/mockClients"
import { mockSessions } from "@/data/mockSessions"
import {
  FLAGGED_THRESHOLD,
  usedHours,
  utilizationClass,
} from "@/lib/authorization"
import { toSlug, unslug } from "@/lib/slug"
import type { ClientAuthorization } from "@/types/authorization"
import type { ClientProfile } from "@/types/client"
import type { Session, SessionStatus } from "@/types/session"

// Display labels for the inline status summary line ("Today: 1 completed,
// 1 in progress…"). Hyphens and tech-style enum values don't read well in
// running prose, so this is a deliberate prose-friendly translation layer.
const STATUS_LABEL: Record<SessionStatus, string> = {
  completed:     "completed",
  "in-progress": "in progress",
  scheduled:     "scheduled",
  cancelled:     "cancelled",
  "no-show":     "no-show",
}

// Status badge config — color + Title-Case label per status. Intentionally
// COPIED (not imported) from TodaySessionsTile.tsx. Two callers is still
// rule-of-three territory; if a third place needs status pill styling we'll
// extract this to a shared module along with StatusBadge below. Until then,
// duplication is cheaper than premature abstraction.
const STATUS_CONFIG: Record<
  SessionStatus,
  { label: string; className: string }
> = {
  completed:     { label: "Completed",   className: "bg-emerald-100 text-emerald-800" },
  "in-progress": { label: "In progress", className: "bg-blue-100 text-blue-800" },
  scheduled:     { label: "Scheduled",   className: "bg-slate-100 text-slate-700" },
  cancelled:     { label: "Cancelled",   className: "bg-amber-100 text-amber-800" },
  "no-show":     { label: "No-show",     className: "bg-red-100 text-red-800" },
}

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
      {children}
    </span>
  )
}

function StatusBadge({ status }: { status: SessionStatus }) {
  const { label, className } = STATUS_CONFIG[status]
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${className}`}
    >
      {label}
    </span>
  )
}

// "HH:mm" slice from an ISO string like "2026-05-12T08:00". Named helper
// because the slice indices are otherwise opaque at the call site.
function formatTime(isoTime: string) {
  return isoTime.slice(11, 16)
}

// Pretty-print an ISO date "2018-03-14" as "Mar 14, 2018". The "T00:00:00"
// suffix forces local-midnight interpretation; without it, JS treats a bare
// "YYYY-MM-DD" as UTC-midnight and can shift the displayed day by one in
// negative-UTC-offset locales (a real bug we'd hit in production with users
// on the West Coast).
function formatDate(iso: string) {
  return new Date(iso + "T00:00:00").toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  })
}

// Derive the care-team roles from this client's session history. Map session
// types to ABA staff roles:
//   - "Direct therapy"               → Technician (RBT)
//   - "Supervision"                  → Supervisor
//   - "Assessment" / "Parent training" → BCBA
// When no session of the relevant type exists for this client, fall back to
// the explicit value on the ClientProfile. This means the page reflects the
// current operational reality (who's actually working with this kid this
// week) when sessions are present, and the assigned-on-paper roster
// otherwise.
function deriveStaffRoles(sessions: Session[], profile: ClientProfile) {
  const technicianFromSessions = sessions.find(
    (s) => s.sessionType === "Direct therapy"
  )?.staffName
  const supervisorFromSessions = sessions.find(
    (s) => s.sessionType === "Supervision"
  )?.staffName
  const bcbaFromSessions = sessions.find(
    (s) => s.sessionType === "Assessment" || s.sessionType === "Parent training"
  )?.staffName

  return {
    technician: technicianFromSessions ?? profile.technician,
    supervisor: supervisorFromSessions ?? profile.supervisor,
    bcba:       bcbaFromSessions       ?? profile.bcba,
  }
}

export function ClientOverviewPage() {
  const { clientId } = useParams<{ clientId: string }>()

  // Slug-match on BOTH sides instead of trying to recover the display name
  // from the slug and string-matching. toSlug() is the canonical form; if
  // names ever pick up apostrophes or accents, we just need toSlug() to
  // agree with itself for matching to keep working.
  const clientSessions = clientId
    ? mockSessions.filter((s) => toSlug(s.clientName) === clientId)
    : []
  const auth = clientId
    ? mockAuthorizations.find((a) => toSlug(a.clientName) === clientId)
    : undefined
  const profile = clientId
    ? mockClients.find((c) => toSlug(c.name) === clientId)
    : undefined

  // Display name preference: canonical name from data wins (correct casing,
  // punctuation, accents); unslug() is the fallback for typo'd or bookmarked
  // URLs that match nothing in any of the three lookups.
  const displayName =
    profile?.name
    ?? auth?.clientName
    ?? clientSessions[0]?.clientName
    ?? (clientId ? unslug(clientId) : "Unknown client")

  const uniqueStaff = Array.from(
    new Set(clientSessions.map((s) => s.staffName))
  )

  // Sorted view of the same sessions, used only by the table render below.
  // Kept separate from `clientSessions` so derivations that don't care about
  // order (chip counts, uniqueStaff Set) aren't quietly affected by a sort.
  // ISO time strings sort chronologically under string compare.
  const sortedClientSessions = [...clientSessions].sort((a, b) =>
    a.time.localeCompare(b.time)
  )

  // Status breakdown — count per status, then format as a single muted line.
  // Skipping zero-count statuses keeps the line short for clients with only
  // one or two sessions today.
  const statusCounts: Partial<Record<SessionStatus, number>> = {}
  for (const s of clientSessions) {
    statusCounts[s.status] = (statusCounts[s.status] ?? 0) + 1
  }
  const statusSummary = (Object.entries(statusCounts) as [SessionStatus, number][])
    .map(([status, count]) => `${count} ${STATUS_LABEL[status]}`)
    .join(" · ")

  return (
    <div className="min-h-svh bg-background text-foreground flex flex-col items-center gap-6 p-4">
      <header className="flex w-full max-w-3xl items-center py-6">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="size-4" />
          Back to dashboard
        </Link>
      </header>

      {/* Section 1 — Client header */}
      <Card className="w-full max-w-3xl">
        <CardHeader>
          <CardTitle className="text-3xl font-semibold tracking-tight">
            {displayName}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <Chip>
              {clientSessions.length} session{clientSessions.length === 1 ? "" : "s"} today
            </Chip>
            <Chip>
              {uniqueStaff.length} staff assigned
            </Chip>
          </div>
          {statusSummary && (
            <p className="text-xs text-muted-foreground">
              Today: {statusSummary}
            </p>
          )}
          {uniqueStaff.length > 0 && (
            <p className="text-xs text-muted-foreground">
              Working with:{" "}
              {uniqueStaff.map((name, i) => (
                <span key={name}>
                  {i > 0 && ", "}
                  <Link
                    to={"/staff/" + toSlug(name)}
                    className="hover:underline underline-offset-2"
                  >
                    {name}
                  </Link>
                </span>
              ))}
            </p>
          )}

          {/* Detail grid — kept inside the same card so this whole block reads
              as one cohesive "who is this client" identity unit. Hidden when
              we can't resolve a profile (typo'd URL); the chips/auth/sessions
              empty states still tell the user nothing matched. */}
          {profile && (
            <ClientDetailGrid profile={profile} sessions={clientSessions} />
          )}
        </CardContent>
      </Card>

      {/* Section 2 — Authorization utilization */}
      <Card className="w-full max-w-3xl">
        <CardHeader>
          <CardTitle>Authorization utilization</CardTitle>
        </CardHeader>
        <CardContent>
          {auth ? (
            <AuthorizationDetail auth={auth} />
          ) : (
            <div className="rounded-md border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
              No authorization data for this client.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Section 3 — Sessions table.
          Title says "Last 7 Days" but mock data is just today; the title
          reflects the eventual real-data scope, not the current fixture. */}
      <Card className="w-full max-w-3xl">
        <CardHeader>
          <CardTitle>Sessions — Last 7 Days</CardTitle>
        </CardHeader>
        <CardContent>
          {sortedClientSessions.length === 0 ? (
            <div className="rounded-md border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
              No sessions found for this client.
            </div>
          ) : (
            <div className="grid grid-cols-[3.5rem_minmax(0,1fr)_8rem_6rem] items-center gap-x-3 gap-y-1 text-xs">
              {/* Header row */}
              <div className="text-muted-foreground pb-2 border-b">Time</div>
              <div className="text-muted-foreground pb-2 border-b">Staff</div>
              <div className="text-muted-foreground pb-2 border-b">Type</div>
              <div className="text-muted-foreground pb-2 border-b text-right">
                Status
              </div>

              {/* Session rows — `display: contents` wrapper makes each row's
                  children participate in the parent grid directly, so all
                  rows align to the same column tracks. Same trick used in
                  TodaySessionsTile. */}
              {sortedClientSessions.map((s) => (
                <div key={s.id} className="contents">
                  <div className="font-mono text-muted-foreground tabular-nums py-1.5">
                    {formatTime(s.time)}
                  </div>
                  <div className="truncate min-w-0 py-1.5 text-sm">
                    <Link
                      to={"/staff/" + toSlug(s.staffName)}
                      className="hover:underline underline-offset-2"
                    >
                      {s.staffName}
                    </Link>
                  </div>
                  <div className="truncate min-w-0 py-1.5 text-muted-foreground">
                    {s.sessionType}
                  </div>
                  <div className="flex items-center justify-end py-1.5">
                    <StatusBadge status={s.status} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

// Extracted to keep the main component readable. Renders the 8-row label/value
// detail block (DOB, address, insurance, auth period, billing code, care team)
// with a thin top border that visually separates it from the chips/status/
// "Working with" block above it within the same card.
function ClientDetailGrid({
  profile,
  sessions,
}: {
  profile: ClientProfile
  sessions: Session[]
}) {
  const { bcba, supervisor, technician } = deriveStaffRoles(sessions, profile)

  return (
    <dl className="grid grid-cols-[max-content_1fr] gap-x-6 gap-y-2 border-t border-border pt-4 text-sm">
      <dt className="text-muted-foreground">Date of birth</dt>
      <dd>{formatDate(profile.dateOfBirth)}</dd>

      <dt className="text-muted-foreground">Address</dt>
      <dd>{profile.address}</dd>

      <dt className="text-muted-foreground">Insurance</dt>
      <dd>{profile.insurance}</dd>

      <dt className="text-muted-foreground">Authorization period</dt>
      <dd>
        {formatDate(profile.authorizationPeriodStart)} –{" "}
        {formatDate(profile.authorizationPeriodEnd)}
      </dd>

      <dt className="text-muted-foreground">CPT / billing code</dt>
      <dd>
        <span className="font-mono">{profile.cptCode}</span>
        <span className="text-muted-foreground"> — {profile.cptLabel}</span>
      </dd>

      <dt className="text-muted-foreground">BCBA</dt>
      <dd>
        <Link
          to={"/staff/" + toSlug(bcba)}
          className="hover:underline underline-offset-2"
        >
          {bcba}
        </Link>
      </dd>

      <dt className="text-muted-foreground">Supervisor</dt>
      <dd>
        <Link
          to={"/staff/" + toSlug(supervisor)}
          className="hover:underline underline-offset-2"
        >
          {supervisor}
        </Link>
      </dd>

      <dt className="text-muted-foreground">Technician</dt>
      <dd>
        <Link
          to={"/staff/" + toSlug(technician)}
          className="hover:underline underline-offset-2"
        >
          {technician}
        </Link>
      </dd>
    </dl>
  )
}

// Extracted because the page already has enough going on, and rendering the
// bar + numbers + plain-English label is its own visual unit. Stays in this
// file because nothing else needs it yet (rule of three).
function AuthorizationDetail({ auth }: { auth: ClientAuthorization }) {
  const { bar, text } = utilizationClass(auth.utilizationPct)
  const used = usedHours(auth.utilizationPct, auth.totalAuthorizedHours)
  const remaining = auth.totalAuthorizedHours - used

  return (
    <div className="space-y-4">
      <div className="flex items-baseline justify-between gap-3">
        <span className={`text-3xl font-semibold tabular-nums ${text}`}>
          {auth.utilizationPct.toFixed(0)}%
        </span>
        <span className="text-sm text-muted-foreground">
          of {auth.totalAuthorizedHours} authorized hours
        </span>
      </div>

      {/* Expanded mini-bar — full content width, slightly chunkier than the
          dashboard tile version (h-3 vs h-2), with the same threshold marker
          at FLAGGED_THRESHOLD% so the visual language stays consistent across
          glance and detail views. */}
      <div className="relative h-3 w-full overflow-hidden rounded-full bg-slate-200">
        <div
          className={`h-full ${bar}`}
          style={{ width: `${Math.min(auth.utilizationPct, 100)}%` }}
        />
        <div
          className="absolute inset-y-0 w-px bg-slate-500/70"
          style={{ left: `${FLAGGED_THRESHOLD}%` }}
          aria-hidden="true"
        />
      </div>

      <p className="text-sm">
        <span className="font-medium tabular-nums">{used}</span>
        <span className="text-muted-foreground"> of </span>
        <span className="font-medium tabular-nums">{auth.totalAuthorizedHours}</span>
        <span className="text-muted-foreground"> hrs used — </span>
        <span className="font-medium tabular-nums">{remaining}</span>
        <span className="text-muted-foreground"> remaining</span>
      </p>
    </div>
  )
}
