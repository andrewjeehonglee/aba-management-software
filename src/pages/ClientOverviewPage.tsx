import { useState, useEffect } from "react"
import { ArrowLeft, Loader2, Play } from "lucide-react"
import { Link, useNavigate, useParams } from "react-router-dom"
import { useDemo } from "@/context/DemoContext"
import { GoalDetailModal } from "@/components/GoalDetailModal"
import { Button } from "@/components/ui/button"
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
import { resolveClientByRouteKey } from "@/lib/rosterScope"
import { createAuthorization, createBehavior, createGoal, createSession, findOpenSessionForClient, getAuthorizationsByClientId, getBehaviorIncidentsByClientId, getBehaviorsByClientId, getGoalsByClientId, getRecentSessionStaffId, getSessionById, getSessionNotesByClientId, getSessionsByClientId, getStaffByUserId, getUserPractice, supabase, updateAuthorization, type AuthRecord, type BehaviorIncidentRecord, type BehaviorRecord, type ClientDetail, type GoalRecord, type PracticeMembership, type SessionNoteRecord, type SessionRecord } from "@/lib/supabase"
import { canManageClinicalConfig, canViewClinicalNotes, effectiveRole } from "@/lib/rolePreview"
import type { Goal } from "@/types/goal"
import { AuthSummary } from "@/pages/ClientOverviewPage/AuthSummary"
import { BehaviorList } from "@/pages/ClientOverviewPage/BehaviorList"
import { CareTeam } from "@/pages/ClientOverviewPage/CareTeam"
import { ClientFactsList } from "@/pages/ClientOverviewPage/ClientFactsList"
import { clientStatusLabel, formatClientDisplayName } from "@/pages/ClientOverviewPage/clientProfileUtils"
import { GoalList } from "@/pages/ClientOverviewPage/GoalList"
import { P, TILE_TITLE } from "@/pages/ClientOverviewPage/profileTokens"
import { RecordsBucket } from "@/pages/ClientOverviewPage/RecordsBucket"
import { SessionCalendarMonth } from "@/pages/ClientOverviewPage/SessionCalendarMonth"

// â”€â”€â”€ New / Edit Authorization Modal â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const EMPTY_AUTH_FORM = { totalHours: "", startDate: "", endDate: "", cptCodes: "" }

interface NewAuthorizationModalProps {
  open:          boolean
  practiceId:    string
  clientId:      string
  existingAuth?: AuthRecord | null
  onClose:       () => void
  onSuccess:     () => void
}

function NewAuthorizationModal({ open, practiceId, clientId, existingAuth, onClose, onSuccess }: NewAuthorizationModalProps) {
  const [form, setForm]       = useState(EMPTY_AUTH_FORM)
  const [error, setError]     = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  // Pre-populate when opening in edit mode
  useEffect(() => {
    if (open && existingAuth) {
      setForm({
        totalHours: existingAuth.totalAuthorizedHours.toString(),
        startDate:  existingAuth.startDate,
        endDate:    existingAuth.endDate,
        cptCodes:   existingAuth.cptCode,
      })
    }
  }, [open])

  function reset() {
    setForm(EMPTY_AUTH_FORM)
    setError(null)
    setLoading(false)
  }

  function handleOpenChange(next: boolean) {
    if (!next) { reset(); onClose() }
  }

  function set<K extends keyof typeof EMPTY_AUTH_FORM>(key: K, value: string) {
    setForm(prev => ({ ...prev, [key]: value }))
  }

  const parsedHours = parseFloat(form.totalHours)
  const canSubmit =
    form.totalHours.trim() && !isNaN(parsedHours) && parsedHours > 0 &&
    form.startDate && form.endDate && form.cptCodes.trim()

  async function handleSubmit() {
    if (!canSubmit) return
    setError(null)
    setLoading(true)
    const cptCodes = form.cptCodes.split(",").map(s => s.trim()).filter(Boolean)
    try {
      if (existingAuth) {
        await updateAuthorization(existingAuth.id, {
          totalAuthorizedHours: parsedHours,
          authStartDate:        form.startDate,
          authEndDate:          form.endDate,
          cptCodes,
        })
      } else {
        await createAuthorization({
          practiceId,
          clientId,
          totalAuthorizedHours: parsedHours,
          authStartDate:        form.startDate,
          authEndDate:          form.endDate,
          cptCodes,
        })
      }
      reset()
      onSuccess()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save authorization.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{existingAuth ? "Edit Authorization" : "Add Authorization"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-1">
          {/* Total authorized hours */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">
              Total authorized hours <span className="text-red-500">*</span>
            </label>
            <Input
              type="number"
              min="1"
              step="1"
              value={form.totalHours}
              onChange={e => set("totalHours", e.target.value)}
              placeholder="e.g. 200"
              disabled={loading}
            />
          </div>

          {/* Date range */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">
                Start date <span className="text-red-500">*</span>
              </label>
              <Input
                type="date"
                value={form.startDate}
                onChange={e => set("startDate", e.target.value)}
                disabled={loading}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">
                End date <span className="text-red-500">*</span>
              </label>
              <Input
                type="date"
                value={form.endDate}
                onChange={e => set("endDate", e.target.value)}
                disabled={loading}
              />
            </div>
          </div>

          {/* CPT codes */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">
              CPT codes <span className="text-red-500">*</span>
            </label>
            <Input
              value={form.cptCodes}
              onChange={e => set("cptCodes", e.target.value)}
              placeholder="e.g. 97153, 97155"
              disabled={loading}
            />
            <p className="text-xs text-muted-foreground">Comma-separated if multiple.</p>
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
              {loading ? "Savingâ€¦" : existingAuth ? "Save Changes" : "Add Authorization"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// â”€â”€â”€ Goal domains (standard ABA program areas) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

// â”€â”€â”€ New Goal Modal â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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
              {loading ? "Savingâ€¦" : "Add Goal"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// â”€â”€â”€ New Behavior Modal â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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
              placeholder="Operational definition â€” how this behavior is recognized and measured"
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
              {loading ? "Savingâ€¦" : "Add Behavior"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// Goal status config â€” four real ABA lifecycle states confirmed by the client.

export function ClientOverviewPage({ practiceId }: { practiceId: string }) {
  const { clientId: clientRouteKey } = useParams<{ clientId: string }>()
  const navigate = useNavigate()
  const isDemo = useDemo()

  const [liveClient, setLiveClient] = useState<ClientDetail | null>(null)
  const [clientLoading, setClientLoading] = useState(true)
  const [clientNotFound, setClientNotFound] = useState(false)
  const resolvedClientId = liveClient?.id ?? null
  const [liveGoals, setLiveGoals] = useState<GoalRecord[] | null>(null)
  const [goalsLoading, setGoalsLoading] = useState(false)
  const [goalsRefreshKey, setGoalsRefreshKey] = useState(0)
  const [liveSessions, setLiveSessions] = useState<SessionRecord[] | null>(null)

  useEffect(() => {
    if (!clientRouteKey) {
      setClientNotFound(true)
      setClientLoading(false)
      return
    }
    setClientLoading(true)
    setClientNotFound(false)
    resolveClientByRouteKey(practiceId, clientRouteKey)
      .then((client) => {
        if (!client) {
          setLiveClient(null)
          setClientNotFound(true)
          return
        }
        setLiveClient(client)
      })
      .catch(() => {
        setLiveClient(null)
        setClientNotFound(true)
      })
      .finally(() => setClientLoading(false))
  }, [clientRouteKey, practiceId])

  useEffect(() => {
    if (!resolvedClientId) return
    setGoalsLoading(true)
    getGoalsByClientId(resolvedClientId)
      .then(setLiveGoals)
      .catch(console.error)
      .finally(() => setGoalsLoading(false))
  }, [resolvedClientId, goalsRefreshKey])

  useEffect(() => {
    if (!resolvedClientId) return
    getSessionsByClientId(resolvedClientId)
      .then(setLiveSessions)
      .catch(console.error)
  }, [resolvedClientId])

  const [liveAuth, setLiveAuth] = useState<AuthRecord | null>(null)
  const [authRefreshKey, setAuthRefreshKey] = useState(0)
  const [authModalOpen, setAuthModalOpen] = useState(false)

  useEffect(() => {
    if (!resolvedClientId) return
    getAuthorizationsByClientId(resolvedClientId)
      .then(setLiveAuth)
      .catch(console.error)
  }, [resolvedClientId, authRefreshKey])

  const [practiceMembership, setPracticeMembership] = useState<PracticeMembership | null>(null)
  const [goalModalOpen, setGoalModalOpen] = useState(false)

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      getUserPractice(user.id).then(m => { if (m) setPracticeMembership(m) }).catch(() => {})
    }).catch(() => {})
  }, [])

  const [sessionNotes, setSessionNotes] = useState<SessionNoteRecord[]>([])

  const [behaviorIncidents, setBehaviorIncidents] = useState<BehaviorIncidentRecord[]>([])

  const effectiveUserRole = effectiveRole(
    practiceMembership?.role ?? (isDemo ? "owner" : undefined),
  )
  const canViewNotes = canViewClinicalNotes(effectiveUserRole)

  useEffect(() => {
    if (!resolvedClientId || !canViewNotes) return
    getSessionNotesByClientId(resolvedClientId)
      .then(setSessionNotes)
      .catch(console.error)
  }, [resolvedClientId, canViewNotes])

  useEffect(() => {
    if (!resolvedClientId || !canViewNotes) return
    getBehaviorIncidentsByClientId(resolvedClientId)
      .then(setBehaviorIncidents)
      .catch(console.error)
  }, [resolvedClientId, canViewNotes])

  const [behaviors, setBehaviors]                   = useState<BehaviorRecord[]>([])
  const [behaviorsLoading, setBehaviorsLoading]     = useState(false)
  const [behaviorsRefreshKey, setBehaviorsRefreshKey] = useState(0)
  const [behaviorModalOpen, setBehaviorModalOpen]   = useState(false)
  const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null)

  useEffect(() => {
    if (!resolvedClientId) return
    setBehaviorsLoading(true)
    getBehaviorsByClientId(resolvedClientId)
      .then(setBehaviors)
      .catch(console.error)
      .finally(() => setBehaviorsLoading(false))
  }, [resolvedClientId, behaviorsRefreshKey])

  const canAddGoal = canManageClinicalConfig(effectiveUserRole)

  const [startSessionLoading, setStartSessionLoading] = useState(false)
  const [startSessionError, setStartSessionError] = useState<string | null>(null)

  async function handleStartSession() {
    if (!resolvedClientId) return
    setStartSessionError(null)
    setStartSessionLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error("Not signed in")
      const membership = await getUserPractice(user.id)
      if (!membership) throw new Error("No practice found for this account")

      if (isDemo) {
        const openSessionId = await findOpenSessionForClient(
          resolvedClientId,
          membership.practice_id,
        )
        if (openSessionId) {
          navigate(`/session/${openSessionId}`)
          return
        }
      }

      let staffRowId = await getStaffByUserId(user.id)
      if (!staffRowId) {
        staffRowId = await getRecentSessionStaffId(resolvedClientId)
      }
      if (!staffRowId) {
        throw new Error("Your account isn't linked to a staff profile yet. Ask your practice owner to set one up for you.")
      }

      const newSessionId = await createSession({
        practiceId:  membership.practice_id,
        clientId:    resolvedClientId,
        staffId:     staffRowId,
        sessionType: "direct",
      })

      const verified = await getSessionById(newSessionId)
      if (!verified) {
        throw new Error("Session could not be loaded. Please try again.")
      }

      navigate(`/session/${newSessionId}`)
    } catch (err) {
      setStartSessionError(err instanceof Error ? err.message : "Failed to start session")
    } finally {
      setStartSessionLoading(false)
    }
  }

  const primaryStaffFromSessions = (() => {
    const pool = liveSessions ?? []
    if (!pool.length) return undefined
    const direct = pool.filter((s) => s.sessionType === "direct")
    const sorted = [...(direct.length ? direct : pool)].sort((a, b) => b.time.localeCompare(a.time))
    return sorted[0]?.staffName
  })()

  const displayName = liveClient ? formatClientDisplayName(liveClient) : "Unknown client"
  const statusLabel = liveClient ? clientStatusLabel(liveClient.status) : "Unknown"
  const isActiveStatus = (liveClient?.status ?? "active").toLowerCase() === "active"

  if (!clientLoading && clientNotFound) {
    return (
      <div
        className="flex min-h-svh items-center justify-center text-sm"
        style={{ backgroundColor: P.bg, color: P.soft }}
      >
        Client not found.
      </div>
    )
  }

  return (
    <div
      className="min-h-svh px-10 py-6"
      style={{ backgroundColor: P.bg, color: P.ink }}
    >
      <div className="mx-auto w-full max-w-[1600px]">
        <header>
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-[15px] transition-opacity hover:opacity-80"
            style={{ color: P.soft }}
          >
            <ArrowLeft className="size-4" />
            Back to dashboard
          </Link>

          <div className="mt-6 flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-[28px] font-semibold tracking-tight">
                {clientLoading ? (
                  <span className="animate-pulse" style={{ color: P.faint }}>
                    Loading…
                  </span>
                ) : (
                  displayName
                )}
              </h1>
              {!clientLoading && liveClient && (
                <span
                  className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[12px] font-medium"
                  style={{
                    backgroundColor: isActiveStatus ? P.sageBg : P.amberBg,
                    color: isActiveStatus ? P.sageInk : P.amberInk,
                  }}
                >
                  <span
                    className="size-1.5 rounded-full"
                    style={{ backgroundColor: isActiveStatus ? P.sage : P.amber }}
                    aria-hidden="true"
                  />
                  {statusLabel}
                </span>
              )}
            </div>

            <div className="flex flex-col items-end gap-1">
              <button
                type="button"
                disabled={startSessionLoading || !resolvedClientId}
                onClick={handleStartSession}
                className="inline-flex h-12 items-center gap-2 rounded-full px-6 text-[16px] font-semibold text-white transition-opacity disabled:opacity-50"
                style={{
                  backgroundColor: P.sage,
                  boxShadow: "0 2px 8px rgba(76, 107, 82, 0.28)",
                }}
              >
                {startSessionLoading ? (
                  <Loader2 className="size-5 animate-spin" />
                ) : (
                  <Play className="size-5 fill-current" />
                )}
                {startSessionLoading ? "Starting…" : "Start session"}
              </button>
              {startSessionError && (
                <p className="text-right text-[13px]" style={{ color: P.cancel }}>
                  {startSessionError}
                </p>
              )}
            </div>
          </div>
        </header>

        <div className="mt-6 flex flex-col gap-6">
          <div className="grid items-stretch gap-6 max-xl:grid-cols-1 xl:grid-cols-[360px_minmax(0,1fr)_360px]">
            <aside
              className="h-full p-5"
              style={{ backgroundColor: P.card, borderRadius: P.radius }}
            >
              <h2 className={TILE_TITLE} style={{ color: P.ink }}>
                Client details
              </h2>
              {!clientLoading && liveClient && (
                <div className="mt-4">
                  <ClientFactsList client={liveClient} auth={liveAuth} />
                  <AuthSummary auth={liveAuth} />
                  <CareTeam
                    clientId={liveClient.id}
                    legacyStaffName={
                      liveClient.assigned_staff?.full_name ?? primaryStaffFromSessions
                    }
                  />
                </div>
              )}
              {clientLoading && (
                <p className="mt-4 py-8 text-[15px] animate-pulse" style={{ color: P.faint }}>
                  Loading client…
                </p>
              )}
            </aside>

            <div className="flex h-full min-w-0">
              <SessionCalendarMonth
                fillHeight
                sessions={liveSessions ?? []}
                sessionNotes={sessionNotes}
              />
            </div>

            {canViewNotes && resolvedClientId && clientRouteKey && (
              <div className="self-start">
                <RecordsBucket
                clientRouteKey={clientRouteKey}
                sessionNotes={sessionNotes}
                sessions={liveSessions ?? []}
                incidents={behaviorIncidents}
              />
              </div>
            )}
          </div>

          <div className="grid items-start gap-6 max-xl:grid-cols-1 xl:grid-cols-2">
            <GoalList
              goals={liveGoals ?? []}
              loading={goalsLoading}
              canAdd={canAddGoal}
              onAdd={() => setGoalModalOpen(true)}
              onSelect={setSelectedGoal}
            />
            <BehaviorList
              behaviors={behaviors}
              incidents={behaviorIncidents}
              loading={behaviorsLoading}
              canAdd={canAddGoal}
              onAdd={() => setBehaviorModalOpen(true)}
            />
          </div>
        </div>
      </div>

      <GoalDetailModal goal={selectedGoal} onClose={() => setSelectedGoal(null)} />

      {canAddGoal && resolvedClientId && practiceMembership && (
        <>
          <NewAuthorizationModal
            open={authModalOpen}
            practiceId={practiceMembership.practice_id}
            clientId={resolvedClientId}
            existingAuth={liveAuth}
            onClose={() => setAuthModalOpen(false)}
            onSuccess={() => {
              setAuthModalOpen(false)
              setAuthRefreshKey((k) => k + 1)
            }}
          />
          <NewGoalModal
            open={goalModalOpen}
            practiceId={practiceMembership.practice_id}
            clientId={resolvedClientId}
            onClose={() => setGoalModalOpen(false)}
            onSuccess={() => {
              setGoalModalOpen(false)
              setGoalsRefreshKey((k) => k + 1)
            }}
          />
          <NewBehaviorModal
            open={behaviorModalOpen}
            practiceId={practiceMembership.practice_id}
            clientId={resolvedClientId}
            onClose={() => setBehaviorModalOpen(false)}
            onSuccess={() => {
              setBehaviorModalOpen(false)
              setBehaviorsRefreshKey((k) => k + 1)
            }}
          />
        </>
      )}
    </div>
  )
}
