import { useState, useEffect } from "react"
import { ArrowLeft, Play } from "lucide-react"
import { Link, useNavigate, useParams } from "react-router-dom"
import { GoalDetailModal } from "@/components/GoalDetailModal"
import { SessionCalendar } from "@/components/SessionCalendar"
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
import { formatTime } from "@/lib/sessions"
import { toSlug, unslug } from "@/lib/slug"
import { getClientById, getGoalsByClientId, getSessionsByClientId, type ClientDetail, type GoalRecord, type SessionRecord } from "@/lib/supabase"
import type { ClientAuthorization } from "@/types/authorization"
import type { ClientProfile } from "@/types/client"
import type { Goal, GoalStatus } from "@/types/goal"
import type { Session, SessionStatus } from "@/types/session"

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

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

// Pluralize "day" / "days" and handle the streak=0 edge case so a fresh goal
// doesn't read as "0 days in a row at 70%" (technically true but parses as
// "this isn't going well," which it isn't).
function formatStreak(days: number, percent: number): string {
  if (days === 0) return "Not started yet"
  return `${days} day${days === 1 ? "" : "s"} in a row at ${percent}%`
}

// "Updated today" / "Updated yesterday" / "Updated 3 days ago" — small
// editorial polish so the page reads less robotic than literal day counts.
function formatLastUpdated(daysAgo: number): string {
  if (daysAgo === 0) return "Updated today"
  if (daysAgo === 1) return "Updated yesterday"
  return `Updated ${daysAgo} days ago`
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

  // If the URL param is a UUID, fetch the client from Supabase.
  // If it's a slug (old links / manual nav), fall back to mock matching.
  const isUUID = UUID_RE.test(clientId ?? "")
  const [liveClient, setLiveClient] = useState<ClientDetail | null>(null)
  const [clientLoading, setClientLoading] = useState(isUUID)
  const [liveGoals, setLiveGoals] = useState<GoalRecord[] | null>(null)
  const [goalsLoading, setGoalsLoading] = useState(isUUID)
  const [liveSessions, setLiveSessions] = useState<SessionRecord[] | null>(null)

  useEffect(() => {
    if (!isUUID || !clientId) return
    getClientById(clientId)
      .then(setLiveClient)
      .catch(console.error)
      .finally(() => setClientLoading(false))
  }, [clientId, isUUID])

  useEffect(() => {
    if (!isUUID || !clientId) return
    getGoalsByClientId(clientId)
      .then(setLiveGoals)
      .catch(console.error)
      .finally(() => setGoalsLoading(false))
  }, [clientId, isUUID])

  useEffect(() => {
    if (!isUUID || !clientId) return
    getSessionsByClientId(clientId)
      .then(setLiveSessions)
      .catch(console.error)
  }, [clientId, isUUID])

  // Slug used for mock lookups — derive from live name when available,
  // otherwise treat the param itself as the slug.
  const mockSlug = liveClient
    ? toSlug(`${liveClient.first_name} ${liveClient.last_name}`)
    : isUUID ? null : (clientId ?? null)

  const todayISO = new Date().toISOString().slice(0, 10)
  const liveSessionsToday = liveSessions?.filter(
    (s) => s.time.slice(0, 10) === todayISO
  ) ?? []
  const liveSessionsLastWeek = liveSessions?.filter((s) => {
    const d = new Date(s.time)
    const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - 7)
    return d >= cutoff
  }) ?? []

  const mockClientSessions = mockSlug
    ? mockSessions.filter((s) => toSlug(s.clientName) === mockSlug)
    : []

  const clientSessions = liveSessions ? liveSessionsToday : mockClientSessions

  const uniqueStaff = Array.from(new Set(clientSessions.map((s) => s.staffName)))

  const sortedClientSessions = liveSessions
    ? [...liveSessionsLastWeek].sort((a, b) => a.time.localeCompare(b.time))
    : [...mockClientSessions].sort((a, b) => a.time.localeCompare(b.time))

  const calendarSessions = liveSessions
    ? liveSessions
    : (mockSlug ? mockCalendarSessions.filter((s) => toSlug(s.clientName) === mockSlug) : [])

  const auth = mockSlug
    ? mockAuthorizations.find((a) => toSlug(a.clientName) === mockSlug)
    : undefined
  const profile = mockSlug
    ? mockClients.find((c) => toSlug(c.name) === mockSlug)
    : undefined

  const displayName = liveClient
    ? `${liveClient.first_name} ${liveClient.last_name}`
    : profile?.name
      ?? auth?.clientName
      ?? clientSessions[0]?.clientName
      ?? (clientId ? unslug(clientId) : "Unknown client")

  const clientGoals: (Goal | GoalRecord)[] = liveGoals ?? (mockSlug ? (mockGoals[mockSlug] ?? []) : [])
  const sortedGoals = [...clientGoals].sort(
    (a, b) =>
      GOAL_STATUS_ORDER[a.status as keyof typeof GOAL_STATUS_ORDER] - GOAL_STATUS_ORDER[b.status as keyof typeof GOAL_STATUS_ORDER] ||
      a.name.localeCompare(b.name)
  )

  const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null)

  const statusCounts: Partial<Record<SessionStatus, number>> = {}
  for (const s of clientSessions) {
    const key = s.status as SessionStatus
    statusCounts[key] = (statusCounts[key] ?? 0) + 1
  }
  const statusSummary = (Object.entries(statusCounts) as [SessionStatus, number][])
    .map(([status, count]) => `${count} ${STATUS_LABEL[status]}`)
    .join(" · ")

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
            {clientLoading ? (
              <span className="text-muted-foreground animate-pulse">Loading…</span>
            ) : (
              displayName
            )}
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

          {/* Live header detail — shown when navigated from the Clients tile */}
          {!clientLoading && liveClient && (
            <LiveClientDetailGrid client={liveClient} />
          )}

          {/* Mock detail grid — fallback for slug-based navigation */}
          {!liveClient && profile && (
            <ClientDetailGrid profile={profile} sessions={clientSessions as unknown as Session[]} />
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

      {/* Section 3 — Session Calendar */}
      <SessionCalendar sessions={calendarSessions as unknown as Session[]} />

      {/* Section 4 — Sessions table.
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
                    <SessionStatusBadge status={s.status as SessionStatus} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Section 4 — Active Goals */}
      <Card className="w-full max-w-3xl">
        <CardHeader>
          <CardTitle>Active Goals</CardTitle>
        </CardHeader>
        <CardContent>
          {goalsLoading ? (
            <p className="py-6 text-center text-sm text-muted-foreground animate-pulse">Loading…</p>
          ) : sortedGoals.length === 0 ? (
            <div className="rounded-md border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
              No active goals for this client.
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {sortedGoals.map((goal) => (
                <GoalRow key={goal.id} goal={goal as Goal} onSelect={() => setSelectedGoal(goal as Goal)} />
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <GoalDetailModal goal={selectedGoal} onClose={() => setSelectedGoal(null)} />
    </div>
  )
}

// Each goal row: name + mastery criterion on the left, streak + status chip
// + "last updated" stacked right-aligned. Items-start so a long mastery
// criterion that wraps doesn't push the right column down.
// The goal name is a button — clicking it opens the GoalDetailModal.
function GoalRow({ goal, onSelect }: { goal: Goal; onSelect: () => void }) {
  const isDiscontinued = goal.status === "discontinued"
  return (
    <li
      className={`flex items-start justify-between gap-4 py-4 first:pt-0 last:pb-0 ${
        isDiscontinued ? "opacity-50" : ""
      }`}
    >
      <div className="flex-1 min-w-0">
        <button
          onClick={onSelect}
          className={`text-left font-semibold text-sm hover:underline underline-offset-2 cursor-pointer ${
            isDiscontinued ? "line-through text-muted-foreground" : ""
          }`}
        >
          {goal.name}
        </button>
        <div className="mt-0.5 text-xs text-muted-foreground">
          {goal.masteryTarget}
        </div>
      </div>
      <div className="flex flex-col items-end gap-1 shrink-0 text-right">
        <div className="text-xs tabular-nums">
          {formatStreak(goal.streakDays, goal.streakPercent)}
        </div>
        <GoalStatusBadge status={goal.status} />
        <div className="text-xs text-muted-foreground">
          {formatLastUpdated(goal.lastUpdatedDaysAgo)}
        </div>
      </div>
    </li>
  )
}

// Live detail grid — rendered when the page is loaded via a UUID-based URL
// from the Clients tile. Shows the fields available in the clients table.
function LiveClientDetailGrid({ client }: { client: ClientDetail }) {
  const STATUS_STYLES: Record<string, string> = {
    active:     "bg-green-100 text-green-800",
    inactive:   "bg-amber-100 text-amber-800",
    discharged: "bg-gray-100 text-gray-600",
  }
  const statusLabel = client.status ?? "unknown"
  const statusCls = STATUS_STYLES[statusLabel.toLowerCase()] ?? "bg-gray-100 text-gray-500"

  return (
    <dl className="grid grid-cols-[max-content_1fr] gap-x-6 gap-y-2 border-t border-border pt-4 text-sm">
      <dt className="text-muted-foreground">Status</dt>
      <dd>
        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${statusCls}`}>
          {statusLabel}
        </span>
      </dd>

      <dt className="text-muted-foreground">Date of birth</dt>
      <dd>{client.date_of_birth ? formatDate(client.date_of_birth) : "—"}</dd>

      <dt className="text-muted-foreground">Team</dt>
      <dd>{client.team ?? "—"}</dd>

      <dt className="text-muted-foreground">Insurance</dt>
      <dd>{client.insurance ?? "—"}</dd>

      <dt className="text-muted-foreground">Authorization period</dt>
      <dd>
        {client.auth_start_date && client.auth_end_date
          ? `${formatDate(client.auth_start_date)} – ${formatDate(client.auth_end_date)}`
          : "—"}
      </dd>

      <dt className="text-muted-foreground">CPT / billing code</dt>
      <dd>
        {client.cpt_codes && client.cpt_codes.length > 0
          ? <span className="font-mono">{client.cpt_codes.join(", ")}</span>
          : "—"}
      </dd>

      <dt className="text-muted-foreground">Assigned staff</dt>
      <dd>
        {client.assigned_staff
          ? (
            <Link
              to={"/staff/" + toSlug(client.assigned_staff.full_name)}
              className="hover:underline underline-offset-2"
            >
              {client.assigned_staff.full_name}
            </Link>
          )
          : "—"}
      </dd>
    </dl>
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
