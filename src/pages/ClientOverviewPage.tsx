import { useState, useEffect } from "react"
import { ArrowLeft, ChevronDown, ChevronRight, Loader2, Play, Plus } from "lucide-react"
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
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
import { createBehavior, createGoal, createSession, getAuthorizationsByClientId, getBehaviorIncidentsByClientId, getBehaviorsByClientId, getClientById, getGoalsByClientId, getSessionNotesByClientId, getSessionsByClientId, getStaffByUserId, getUserPractice, supabase, type AuthRecord, type BehaviorIncidentRecord, type BehaviorRecord, type ClientDetail, type GoalRecord, type PracticeMembership, type SessionNoteRecord, type SessionRecord } from "@/lib/supabase"
import type { ClientAuthorization } from "@/types/authorization"
import type { ClientProfile } from "@/types/client"
import type { Goal, GoalStatus } from "@/types/goal"
import type { Session, SessionStatus } from "@/types/session"

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// ─── Goal domains (standard ABA program areas) ────────────────────────────────
const GOAL_DOMAINS = [
  "Communication",
  "Social Skills",
  "Adaptive / Self-Care",
  "Behavior Reduction",
  "Motor Skills",
  "Academic / Cognitive",
] as const

const GOAL_STATUSES: { value: string; label: string }[] = [
  { value: "in-progress",  label: "In Progress"  },
  { value: "hold",         label: "Hold"          },
  { value: "discontinued", label: "Discontinued"  },
  { value: "mastered",     label: "Mastered"      },
]

const EMPTY_GOAL_FORM = {
  name:            "",
  domain:          "" as string,
  masteryCriteria: "",
  status:          "in-progress",
}

// ─── New Goal Modal ───────────────────────────────────────────────────────────

interface NewGoalModalProps {
  open:       boolean
  practiceId: string
  clientId:   string
  onClose:    () => void
  onSuccess:  () => void
}

function NewGoalModal({ open, practiceId, clientId, onClose, onSuccess }: NewGoalModalProps) {
  const [form, setForm]       = useState(EMPTY_GOAL_FORM)
  const [error, setError]     = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  function reset() {
    setForm(EMPTY_GOAL_FORM)
    setError(null)
    setLoading(false)
  }

  function handleOpenChange(next: boolean) {
    if (!next) { reset(); onClose() }
  }

  function set<K extends keyof typeof EMPTY_GOAL_FORM>(key: K, value: string) {
    setForm(prev => ({ ...prev, [key]: value }))
  }

  const canSubmit = form.name.trim() && form.domain && form.masteryCriteria.trim()

  async function handleSubmit() {
    if (!canSubmit) return
    setError(null)
    setLoading(true)
    try {
      await createGoal({
        practiceId,
        clientId,
        name:            form.name.trim(),
        masteryCriteria: form.masteryCriteria.trim(),
        domain:          form.domain,
        status:          form.status,
      })
      reset()
      onSuccess()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create goal.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New Goal</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-1">
          {/* Goal name */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">
              Goal name <span className="text-red-500">*</span>
            </label>
            <Input
              value={form.name}
              onChange={e => set("name", e.target.value)}
              placeholder="e.g. Manding for preferred items"
              disabled={loading}
            />
          </div>

          {/* Domain */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">
              Domain <span className="text-red-500">*</span>
            </label>
            <Select value={form.domain ?? ""} onValueChange={v => set("domain", v ?? "")} disabled={loading}>
              <SelectTrigger>
                <SelectValue placeholder="Select domain" />
              </SelectTrigger>
              <SelectContent>
                {GOAL_DOMAINS.map(d => (
                  <SelectItem key={d} value={d}>{d}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Mastery criteria */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">
              Mastery criteria <span className="text-red-500">*</span>
            </label>
            <textarea
              value={form.masteryCriteria}
              onChange={e => set("masteryCriteria", e.target.value)}
              placeholder="e.g. 80% accuracy across 3 consecutive sessions"
              rows={3}
              disabled={loading}
              className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none disabled:opacity-50"
            />
          </div>

          {/* Status */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Status</label>
            <Select value={form.status ?? ""} onValueChange={v => set("status", v ?? "")} disabled={loading}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {GOAL_STATUSES.map(s => (
                  <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {error && (
            <p className="rounded-md bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => { reset(); onClose() }}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleSubmit}
              disabled={!canSubmit || loading}
            >
              {loading ? "Saving…" : "Add Goal"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ─── New Behavior Modal ───────────────────────────────────────────────────────

interface NewBehaviorModalProps {
  open:       boolean
  practiceId: string
  clientId:   string
  onClose:    () => void
  onSuccess:  () => void
}

const EMPTY_BEHAVIOR_FORM = { name: "", description: "" }

function NewBehaviorModal({ open, practiceId, clientId, onClose, onSuccess }: NewBehaviorModalProps) {
  const [form, setForm]       = useState(EMPTY_BEHAVIOR_FORM)
  const [error, setError]     = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  function reset() {
    setForm(EMPTY_BEHAVIOR_FORM)
    setError(null)
    setLoading(false)
  }

  function handleOpenChange(next: boolean) {
    if (!next) { reset(); onClose() }
  }

  const canSubmit = form.name.trim().length > 0

  async function handleSubmit() {
    if (!canSubmit) return
    setError(null)
    setLoading(true)
    try {
      await createBehavior({
        practiceId,
        clientId,
        name:        form.name.trim(),
        description: form.description.trim() || undefined,
      })
      reset()
      onSuccess()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create behavior.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New Behavior</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-1">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">
              Behavior name <span className="text-red-500">*</span>
            </label>
            <Input
              value={form.name}
              onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))}
              placeholder="e.g. Self-injurious behavior"
              disabled={loading}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium">
              Description <span className="text-muted-foreground font-normal">(optional)</span>
            </label>
            <textarea
              value={form.description}
              onChange={e => setForm(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Operational definition — how this behavior is recognized and measured"
              rows={3}
              disabled={loading}
              className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none disabled:opacity-50"
            />
          </div>

          {error && (
            <p className="rounded-md bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => { reset(); onClose() }}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleSubmit}
              disabled={!canSubmit || loading}
            >
              {loading ? "Saving…" : "Add Behavior"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

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
  const [goalsRefreshKey, setGoalsRefreshKey] = useState(0)
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
    setGoalsLoading(true)
    getGoalsByClientId(clientId)
      .then(setLiveGoals)
      .catch(console.error)
      .finally(() => setGoalsLoading(false))
  }, [clientId, isUUID, goalsRefreshKey])

  useEffect(() => {
    if (!isUUID || !clientId) return
    getSessionsByClientId(clientId)
      .then(setLiveSessions)
      .catch(console.error)
  }, [clientId, isUUID])

  const [liveAuth, setLiveAuth] = useState<AuthRecord | null>(null)

  useEffect(() => {
    if (!isUUID || !clientId) return
    getAuthorizationsByClientId(clientId)
      .then(setLiveAuth)
      .catch(console.error)
  }, [clientId, isUUID])

  const [practiceMembership, setPracticeMembership] = useState<PracticeMembership | null>(null)
  const [goalModalOpen, setGoalModalOpen] = useState(false)

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      getUserPractice(user.id).then(m => { if (m) setPracticeMembership(m) }).catch(() => {})
    }).catch(() => {})
  }, [])

  const [sessionNotes, setSessionNotes] = useState<SessionNoteRecord[]>([])
  const [notesLoading, setNotesLoading] = useState(false)

  const [behaviorIncidents, setBehaviorIncidents] = useState<BehaviorIncidentRecord[]>([])
  const [incidentsLoading, setIncidentsLoading] = useState(false)

  const canViewNotes =
    practiceMembership?.role === "bcba" ||
    practiceMembership?.role === "owner" ||
    practiceMembership?.role === "supervisor"

  useEffect(() => {
    if (!isUUID || !clientId || !canViewNotes) return
    setNotesLoading(true)
    getSessionNotesByClientId(clientId)
      .then(setSessionNotes)
      .catch(console.error)
      .finally(() => setNotesLoading(false))
  }, [clientId, isUUID, canViewNotes])

  useEffect(() => {
    if (!isUUID || !clientId || !canViewNotes) return
    setIncidentsLoading(true)
    getBehaviorIncidentsByClientId(clientId)
      .then(setBehaviorIncidents)
      .catch(console.error)
      .finally(() => setIncidentsLoading(false))
  }, [clientId, isUUID, canViewNotes])

  const [behaviors, setBehaviors]                   = useState<BehaviorRecord[]>([])
  const [behaviorsLoading, setBehaviorsLoading]     = useState(false)
  const [behaviorsRefreshKey, setBehaviorsRefreshKey] = useState(0)
  const [behaviorModalOpen, setBehaviorModalOpen]   = useState(false)

  useEffect(() => {
    if (!isUUID || !clientId) return
    setBehaviorsLoading(true)
    getBehaviorsByClientId(clientId)
      .then(setBehaviors)
      .catch(console.error)
      .finally(() => setBehaviorsLoading(false))
  }, [clientId, isUUID, behaviorsRefreshKey])

  const canAddGoal = practiceMembership?.role === "bcba" || practiceMembership?.role === "owner"

  const [startSessionLoading, setStartSessionLoading] = useState(false)
  const [startSessionError, setStartSessionError] = useState<string | null>(null)

  async function handleStartSession() {
    if (!clientId) return
    setStartSessionError(null)
    setStartSessionLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error("Not signed in")
      const membership = await getUserPractice(user.id)
      if (!membership) throw new Error("No practice found for this account")
      const staffRowId = await getStaffByUserId(user.id)
      if (!staffRowId) throw new Error("Your account isn't linked to a staff profile yet. Ask your practice owner to set one up for you.")
      const newSessionId = await createSession({
        practiceId:  membership.practice_id,
        clientId,
        staffId:     staffRowId,
        sessionType: "direct",
      })
      navigate(`/session/${newSessionId}`)
    } catch (err) {
      setStartSessionError(err instanceof Error ? err.message : "Failed to start session")
    } finally {
      setStartSessionLoading(false)
    }
  }

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

  const auth = liveAuth
    ?? (mockSlug ? mockAuthorizations.find((a) => toSlug(a.clientName) === mockSlug) : undefined)
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
        <div className="flex flex-col items-end gap-1">
          <Button
            size="lg"
            disabled={startSessionLoading}
            onClick={handleStartSession}
            className="gap-2 shadow-md"
          >
            {startSessionLoading
              ? <Loader2 className="size-4 animate-spin" />
              : <Play className="size-4 fill-current" />}
            {startSessionLoading ? "Starting…" : "Start Session"}
          </Button>
          {startSessionError && (
            <p className="text-xs text-red-600 text-right max-w-[200px]">
              {startSessionError}
            </p>
          )}
        </div>
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
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle>Active Goals</CardTitle>
          {canAddGoal && isUUID && (
            <Button
              size="sm"
              variant="outline"
              className="h-7 px-2.5 text-xs gap-1"
              onClick={() => setGoalModalOpen(true)}
            >
              <Plus className="size-3.5" />
              New Goal
            </Button>
          )}
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

      {canAddGoal && isUUID && clientId && practiceMembership && (
        <NewGoalModal
          open={goalModalOpen}
          practiceId={practiceMembership.practice_id}
          clientId={clientId}
          onClose={() => setGoalModalOpen(false)}
          onSuccess={() => { setGoalModalOpen(false); setGoalsRefreshKey(k => k + 1) }}
        />
      )}

      {/* Section 5 — Behaviors */}
      {isUUID && (
        <Card className="w-full max-w-3xl">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle>Behaviors</CardTitle>
            {canAddGoal && (
              <Button
                size="sm"
                variant="outline"
                className="h-7 px-2.5 text-xs gap-1"
                onClick={() => setBehaviorModalOpen(true)}
              >
                <Plus className="size-3.5" />
                New Behavior
              </Button>
            )}
          </CardHeader>
          <CardContent>
            {behaviorsLoading ? (
              <p className="py-6 text-center text-sm text-muted-foreground animate-pulse">Loading…</p>
            ) : behaviors.length === 0 ? (
              <div className="rounded-md border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                No behaviors defined for this client.
              </div>
            ) : (
              <ul className="divide-y divide-border">
                {behaviors.map((b) => (
                  <li key={b.id} className="py-3 first:pt-0 last:pb-0">
                    <p className="text-sm font-medium">{b.name}</p>
                    {b.description && (
                      <p className="mt-0.5 text-xs text-muted-foreground">{b.description}</p>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      )}

      {canAddGoal && isUUID && clientId && practiceMembership && (
        <NewBehaviorModal
          open={behaviorModalOpen}
          practiceId={practiceMembership.practice_id}
          clientId={clientId}
          onClose={() => setBehaviorModalOpen(false)}
          onSuccess={() => { setBehaviorModalOpen(false); setBehaviorsRefreshKey(k => k + 1) }}
        />
      )}

      {/* Section 6 — Behavior Incidents (BCBA / Supervisor / Owner only) */}
      {canViewNotes && isUUID && (
        <Card className="w-full max-w-3xl">
          <CardHeader>
            <CardTitle>Behavior Incidents</CardTitle>
          </CardHeader>
          <CardContent>
            {incidentsLoading ? (
              <p className="py-6 text-center text-sm text-muted-foreground animate-pulse">Loading…</p>
            ) : behaviorIncidents.length === 0 ? (
              <div className="rounded-md border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                No behavior incidents recorded.
              </div>
            ) : (
              <ul className="divide-y divide-border">
                {behaviorIncidents.map((incident) => (
                  <BehaviorIncidentRow key={incident.id} incident={incident} />
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      )}

      {/* Section 7 — Session Notes (BCBA / Supervisor / Owner only) */}
      {canViewNotes && isUUID && (
        <Card className="w-full max-w-3xl">
          <CardHeader>
            <CardTitle>Session Notes</CardTitle>
          </CardHeader>
          <CardContent>
            {notesLoading ? (
              <p className="py-6 text-center text-sm text-muted-foreground animate-pulse">Loading…</p>
            ) : sessionNotes.length === 0 ? (
              <div className="rounded-md border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                No session notes yet.
              </div>
            ) : (
              <ul className="divide-y divide-border">
                {sessionNotes.map((note) => (
                  <SessionNoteRow key={note.id} note={note} />
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      )}
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

// Expandable row for a single SOAP note. Collapsed by default — the date and
// a truncated preview of the subjective field give enough context to decide
// whether to open. Clicking anywhere on the header row toggles the body.
function SessionNoteRow({ note }: { note: SessionNoteRecord }) {
  const [open, setOpen] = useState(false)
  const date = new Date(note.created_at).toLocaleDateString("en-US", {
    month: "short",
    day:   "numeric",
    year:  "numeric",
  })
  const time = new Date(note.created_at).toLocaleTimeString("en-US", {
    hour:   "numeric",
    minute: "2-digit",
  })

  return (
    <li className="py-3 first:pt-0 last:pb-0">
      <button
        className="flex w-full items-start gap-2 text-left"
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
      >
        <span className="mt-0.5 shrink-0 text-muted-foreground">
          {open
            ? <ChevronDown className="size-4" />
            : <ChevronRight className="size-4" />}
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2">
            <span className="text-sm font-medium">{date}</span>
            <span className="text-xs text-muted-foreground">{time}</span>
          </div>
          {!open && note.subjective && (
            <p className="mt-0.5 text-xs text-muted-foreground truncate">
              {note.subjective}
            </p>
          )}
        </div>
      </button>

      {open && (
        <div className="mt-3 ml-6 grid grid-cols-[5rem_1fr] gap-x-4 gap-y-3 text-sm">
          {(
            [
              { label: "Subjective",  value: note.subjective  },
              { label: "Objective",   value: note.objective   },
              { label: "Assessment",  value: note.assessment  },
              { label: "Plan",        value: note.plan        },
            ] as const
          ).map(({ label, value }) => (
            <div key={label} className="contents">
              <dt className="text-xs font-semibold text-muted-foreground pt-0.5 uppercase tracking-wide">
                {label}
              </dt>
              <dd className="text-sm leading-relaxed whitespace-pre-wrap">
                {value || <span className="text-muted-foreground italic">—</span>}
              </dd>
            </div>
          ))}
        </div>
      )}
    </li>
  )
}

// Expandable row for a single behavior incident. Collapsed state shows date,
// behavior name, and intensity chip. Expanded state shows antecedents,
// consequences, and duration in the same labeled-grid layout as SessionNoteRow.
function formatDuration(seconds: number | null): string {
  if (seconds === null || seconds === undefined) return "—"
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  if (m === 0) return `${s}s`
  return s === 0 ? `${m}m` : `${m}m ${s}s`
}

const INTENSITY_CHIP: Record<string, string> = {
  High:   "bg-red-100 text-red-700",
  Medium: "bg-amber-100 text-amber-700",
  Low:    "bg-slate-100 text-slate-700",
}

function BehaviorIncidentRow({ incident }: { incident: BehaviorIncidentRecord }) {
  const [open, setOpen] = useState(false)
  const date = new Date(incident.created_at).toLocaleDateString("en-US", {
    month: "short",
    day:   "numeric",
    year:  "numeric",
  })
  const time = new Date(incident.created_at).toLocaleTimeString("en-US", {
    hour:   "numeric",
    minute: "2-digit",
  })
  const behaviorName = incident.behaviors?.name ?? "Unknown behavior"
  const intensityCls = incident.intensity ? (INTENSITY_CHIP[incident.intensity] ?? "bg-slate-100 text-slate-700") : null

  const antecedentsStr = incident.antecedents?.length ? incident.antecedents.join(", ") : "—"
  const consequencesStr = incident.consequences?.length ? incident.consequences.join(", ") : "—"

  return (
    <li className="py-3 first:pt-0 last:pb-0">
      <button
        className="flex w-full items-start gap-2 text-left"
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
      >
        <span className="mt-0.5 shrink-0 text-muted-foreground">
          {open
            ? <ChevronDown className="size-4" />
            : <ChevronRight className="size-4" />}
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-baseline gap-2">
            <span className="text-sm font-medium">{date}</span>
            <span className="text-xs text-muted-foreground">{time}</span>
            <span className="text-sm font-semibold">{behaviorName}</span>
            {intensityCls && (
              <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${intensityCls}`}>
                {incident.intensity}
              </span>
            )}
          </div>
        </div>
      </button>

      {open && (
        <dl className="mt-3 ml-6 grid grid-cols-[6rem_1fr] gap-x-4 gap-y-3 text-sm">
          {([
            { label: "Antecedents",  value: antecedentsStr  },
            { label: "Consequences", value: consequencesStr },
            { label: "Duration",     value: formatDuration(incident.duration_seconds) },
          ]).map(({ label, value }) => (
            <div key={label} className="contents">
              <dt className="text-xs font-semibold text-muted-foreground pt-0.5 uppercase tracking-wide">
                {label}
              </dt>
              <dd className="text-sm leading-relaxed">
                {value}
              </dd>
            </div>
          ))}
        </dl>
      )}
    </li>
  )
}

// Extracted because the page already has enough going on, and rendering the
// bar + numbers + plain-English label is its own visual unit. Stays in this
// file because nothing else needs it yet (rule of three).
function AuthorizationDetail({ auth }: { auth: ClientAuthorization | AuthRecord }) {
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
