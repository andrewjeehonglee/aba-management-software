import { ArrowLeft, Play } from "lucide-react"
import { Link, useNavigate, useParams } from "react-router-dom"
import { SessionStatusBadge } from "@/components/SessionStatusBadge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { mockAuthorizations } from "@/data/mockAuthorizations"
import { mockCalendarSessions } from "@/data/mockCalendarSessions"
import { mockClients } from "@/data/mockClients"
import { mockGoals } from "@/data/mockGoals"
import { mockSessions } from "@/data/mockSessions"
import {
  FLAGGED_THRESHOLD,
  usedHours,
  utilizationClass,
} from "@/lib/authorization"
import { toSlug, unslug } from "@/lib/slug"
import type { ClientAuthorization } from "@/types/authorization"
import type { ClientProfile } from "@/types/client"
import type { Goal, GoalStatus } from "@/types/goal"
import type { Session, SessionStatus } from "@/types/session"

// Fixed "today" — matches SessionCalendar and CertificationsExpiringTile so
// the "upcoming" filter is consistent with what the calendar displayed.
const TODAY_ISO = "2026-05-18"

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

// Goal status config — four real ABA lifecycle states confirmed by the client.
// Sort order: in-progress first (active work), then hold (needs review),
// then mastered (completed successfully), then discontinued (inactive, muted).
const GOAL_STATUS_CONFIG: Record<
  GoalStatus,
  { label: string; className: string }
> = {
  "in-progress": { label: "In progress",  className: "bg-blue-100 text-blue-800"       },
  hold:          { label: "Hold",         className: "bg-amber-100 text-amber-800"     },
  mastered:      { label: "Mastered",     className: "bg-emerald-100 text-emerald-800" },
  discontinued:  { label: "Discontinued", className: "bg-gray-100 text-gray-500"       },
}

const GOAL_STATUS_ORDER: Record<GoalStatus, number> = {
  "in-progress": 0,
  hold:          1,
  mastered:      2,
  discontinued:  3,
}

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
      {children}
    </span>
  )
}

function GoalStatusBadge({ status }: { status: GoalStatus }) {
  const { label, className } = GOAL_STATUS_CONFIG[status]
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${className}`}
    >
      {label}
    </span>
  )
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
  const navigate = useNavigate()

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

  // Calendar sessions — separate data source covering 4+ weeks of history
  // plus future scheduled sessions. `mockSessions` is "today only" for the
  // dashboard tile; `mockCalendarSessions` is the fuller scheduling record.
  const calendarSessions = clientId
    ? mockCalendarSessions.filter((s) => toSlug(s.clientName) === clientId)
    : []

  // Active goals — keyed by slug for direct lookup. Sorted by status priority
  // (most concerning first), then alphabetically by name within the same
  // status for stable ordering.
  const clientGoals = (clientId && mockGoals[clientId]) || []
  const sortedGoals = [...clientGoals].sort(
    (a, b) =>
      GOAL_STATUS_ORDER[a.status] - GOAL_STATUS_ORDER[b.status] ||
      a.name.localeCompare(b.name)
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

  // Pick the best session to "start" — prefer a scheduled or in-progress
  // session from today's list, fall back to the next scheduled in the full
  // calendar, then to any session at all. The ID is passed to SessionViewPage
  // so it can eventually load the right clinical context.
  const nextSession =
    clientSessions.find((s) => s.status === "scheduled" || s.status === "in-progress") ??
    calendarSessions.find((s) => s.status === "scheduled") ??
    calendarSessions[0]
  const startSessionId = nextSession?.id ?? `${clientId ?? "client"}-1`

  return (
    <div className="min-h-svh bg-background text-foreground flex flex-col items-center gap-6 p-4">
      <header className="flex w-full max-w-3xl items-center justify-between py-6">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="size-4" />
          Back to dashboard
        </Link>
        <Button
          size="lg"
          onClick={() => navigate(`/session/${startSessionId}`)}
          className="gap-2 shadow-md"
        >
          <Play className="size-4 fill-current" />
          Start Session
        </Button>
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

      {/* Section 3 — Upcoming Sessions (next 3 scheduled sessions) */}
      <Card className="w-full max-w-3xl">
        <CardHeader>
          <CardTitle>Upcoming Sessions</CardTitle>
        </CardHeader>
        <CardContent>
          <UpcomingSessions sessions={calendarSessions} />
        </CardContent>
      </Card>

      {/* Section 4 — Active Goals */}
      <Card className="w-full max-w-3xl">
        <CardHeader>
          <CardTitle>Active Goals</CardTitle>
        </CardHeader>
        <CardContent>
          {sortedGoals.length === 0 ? (
            <div className="rounded-md border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
              No active goals for this client.
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {sortedGoals.map((goal) => (
                <GoalRow key={goal.id} goal={goal} />
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

// Flat goal row — name + status chip on one line, mastery criteria below.
// Discontinued goals are dimmed and the name gets a strikethrough.
function GoalRow({ goal }: { goal: Goal }) {
  const isDiscontinued = goal.status === "discontinued"
  return (
    <li
      className={`flex items-start justify-between gap-4 py-3.5 first:pt-0 last:pb-0 ${
        isDiscontinued ? "opacity-50" : ""
      }`}
    >
      <div className="flex-1 min-w-0">
        <span
          className={`text-sm font-semibold ${
            isDiscontinued ? "line-through text-muted-foreground" : ""
          }`}
        >
          {goal.name}
        </span>
        <p className="mt-0.5 text-xs text-muted-foreground">{goal.masteryTarget}</p>
      </div>
      <GoalStatusBadge status={goal.status} />
    </li>
  )
}

// Next 3 scheduled sessions from the calendar, sorted by date/time.
// Formats each as "Day, Mon D · HH:MM AM/PM · Staff Name".
function UpcomingSessions({ sessions }: { sessions: Session[] }) {
  const upcoming = sessions
    .filter((s) => s.status === "scheduled" && s.time.slice(0, 10) > TODAY_ISO)
    .sort((a, b) => a.time.localeCompare(b.time))
    .slice(0, 3)

  if (upcoming.length === 0) {
    return (
      <div className="rounded-md border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
        No upcoming sessions scheduled.
      </div>
    )
  }

  return (
    <ul className="divide-y divide-border">
      {upcoming.map((s) => {
        const dateObj = new Date(s.time)
        const dateLabel = dateObj.toLocaleDateString("en-US", {
          weekday: "short",
          month: "short",
          day: "numeric",
        })
        const timeLabel = dateObj.toLocaleTimeString("en-US", {
          hour: "numeric",
          minute: "2-digit",
        })
        return (
          <li key={s.id} className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0">
            <div>
              <p className="text-sm font-medium">{dateLabel}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{timeLabel} · {s.staffName}</p>
            </div>
            <SessionStatusBadge status={s.status} />
          </li>
        )
      })}
    </ul>
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
