import { useEffect, useRef, useState } from "react"
import { ArrowLeft, Check, Minus, Plus, X } from "lucide-react"
import { Link, useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom"
import { toast } from "sonner"
import { useDemo } from "@/context/DemoContext"
import { SignaturePad } from "@/components/SignaturePad"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { completeSession, getBehaviorsByClientId, getClientById, getGoalsByClientId, getSessionById, getUserPractice, isNewSessionRoute, isValidSessionId, buildNewSessionDetail, buildSessionDetailFromBootstrap, saveBehaviorIncident, saveTrialResult, submitSessionNote, supabase, type BehaviorRecord, type ClientDetail, type GoalRecord, type SessionDetail, type SessionPageBootstrap } from "@/lib/supabase"
import type { GoalStatus } from "@/types/goal"
import { P, TILE_TITLE } from "@/pages/ClientOverviewPage/profileTokens"

const PAGE_MAX = "mx-auto w-full max-w-[1600px]"
const META_LABEL = "text-[14px] font-semibold shrink-0"
const BODY_TEXT = "text-[15px]"

const ATTENDEE_OPTIONS = ["Mom", "Dad", "Grandparents", "Supervisor", "BCBA"] as const

const ANTECEDENTS = [
  "Demand placed",
  "Waiting",
  "New activity",
  "Difficult activity",
  "Preferred activity interrupted",
  "Denied access",
  "Loud / noisy environment",
  "Given a correction",
  "Transition",
  "Attention given to others",
  "Left alone",
  "Other",
]

const CONSEQUENCES = [
  "Verbal redirection",
  "Physical assist / prompt",
  "Ignored problem behavior",
  "Kept demand",
  "Used proximity control",
  "Verbal reprimand",
  "Removed from activity / location",
  "Interrupted / blocked and redirected",
  "Left alone",
  "Loss of privilege",
  "Calming / soothing",
  "Peer remarks / laughter",
]

const INTENSITIES = ["Low", "Medium", "High"] as const
type Intensity = typeof INTENSITIES[number]

const DURATIONS = ["<1 min", "1–5 min", "5–10 min", "10–30 min", "½–1 hr", "1+ hr"]

const WHY_X_REASONS = [
  "Verbal/vocal prompt needed",
  "Physical prompt needed",
  "Refused task",
  "Distracted",
  "Not yet introduced",
  "Other",
]

const GOAL_STATUS_CONFIG: Record<GoalStatus, { label: string; className: string }> = {
  "in-progress": { label: "In progress",  className: "bg-blue-100 text-blue-800"       },
  hold:          { label: "Hold",         className: "bg-amber-100 text-amber-800"     },
  discontinued:  { label: "Discontinued", className: "bg-gray-100 text-gray-500"       },
  mastered:      { label: "Mastered",     className: "bg-emerald-100 text-emerald-800" },
}

const SOAP_FIELDS = [
  { key: "subjective" as const, label: "Subjective", prompt: "What did the caregiver or client report at the start of the session?" },
  { key: "objective"  as const, label: "Objective",  prompt: "What data was collected? Summarize program performance and behavior incidents." },
  { key: "action"     as const, label: "Action",     prompt: "What interventions or strategies were used?" },
  { key: "plan"       as const, label: "Plan",       prompt: "What are the goals or adjustments for the next session?" },
]

const SESSION_OUTCOMES = [
  { key: "occurred"  as const, label: "Occurred",   description: "Completed as planned",       ring: "border-emerald-500 bg-emerald-50 text-emerald-900" },
  { key: "shortened" as const, label: "Shortened",  description: "Session ended early",        ring: "border-blue-500 bg-blue-50 text-blue-900" },
  { key: "cancelled" as const, label: "Cancelled",  description: "Did not occur (planned)",    ring: "border-amber-500 bg-amber-50 text-amber-900" },
  { key: "no-show"   as const, label: "No-show",    description: "Client did not arrive",      ring: "border-red-500 bg-red-50 text-red-900" },
]

// ─── Types ────────────────────────────────────────────────────────────────────

interface ABCDraft {
  antecedents: string[]
  consequences: string[]
  intensity: Intensity | ""
  duration: string
}

interface ABCEntry {
  id: string
  antecedents: string[]
  consequences: string[]
  intensity: Intensity
  duration: string
}

type TrialOutcome = { result: "correct" } | { result: "incorrect"; reason: string }
type SessionOutcome = "occurred" | "shortened" | "cancelled" | "no-show"

// ─── Helpers ──────────────────────────────────────────────────────────────────

function calcPct(ts: TrialOutcome[]): number {
  if (ts.length === 0) return 0
  return Math.round((ts.filter(t => t.result === "correct").length / ts.length) * 100)
}

// Textarea styled to match shadcn Input so the visual language stays consistent.
function Textarea({ value, onChange, placeholder, rows = 3 }: {
  value: string
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void
  placeholder?: string
  rows?: number
}) {
  return (
    <textarea
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      rows={rows}
      className="flex w-full rounded-md border px-3 py-2 text-[15px] shadow-xs resize-none focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
      style={{ borderColor: P.rule, backgroundColor: P.inset, color: P.ink }}
    />
  )
}

// ─── ABC Flow ─────────────────────────────────────────────────────────────────

interface ABCFlowProps {
  step: number
  draft: ABCDraft
  onStep: (n: number) => void
  onToggleA: (v: string) => void
  onToggleC: (v: string) => void
  onIntensity: (v: Intensity) => void
  onDuration: (v: string) => void
  onSave: () => void
  onCancel: () => void
}

function ABCFlow({ step, draft, onStep, onToggleA, onToggleC, onIntensity, onDuration, onSave, onCancel }: ABCFlowProps) {
  const canNext = step === 1 ? draft.antecedents.length > 0 : step === 2 ? draft.consequences.length > 0 : false
  const canSave = !!draft.intensity && !!draft.duration

  return (
    <div className="rounded-xl border p-4 space-y-3" style={{ backgroundColor: P.inset, borderColor: P.rule }}>
      <div className="flex items-center gap-1.5 text-[13px]" style={{ color: P.soft }}>
        {["Antecedent", "Consequence", "Details"].map((label, i) => (
          <span key={label} className={i + 1 === step ? "font-semibold" : ""} style={i + 1 === step ? { color: P.ink } : undefined}>
            {i > 0 && <span className="mx-1">›</span>}
            {i + 1}. {label}
          </span>
        ))}
      </div>

      {step === 1 && (
        <div className="space-y-2">
          <p className="text-[14px] font-semibold" style={{ color: P.ink }}>What happened before the behavior?</p>
          <div className="grid grid-cols-2 gap-1.5">
            {ANTECEDENTS.map(item => (
              <label key={item} className="flex items-center gap-2 rounded-lg border px-2.5 py-2 cursor-pointer hover:opacity-85 transition-opacity min-h-[44px] text-[14px]" style={{ backgroundColor: P.card, borderColor: P.rule, color: P.ink }}>
                <input type="checkbox" checked={draft.antecedents.includes(item)} onChange={() => onToggleA(item)} className="size-3.5 shrink-0" />
                {item}
              </label>
            ))}
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-2">
          <p className="text-[14px] font-semibold" style={{ color: P.ink }}>What happened after the behavior?</p>
          <div className="grid grid-cols-2 gap-1.5">
            {CONSEQUENCES.map(item => (
              <label key={item} className="flex items-center gap-2 rounded-lg border px-2.5 py-2 cursor-pointer hover:opacity-85 transition-opacity min-h-[44px] text-[14px]" style={{ backgroundColor: P.card, borderColor: P.rule, color: P.ink }}>
                <input type="checkbox" checked={draft.consequences.includes(item)} onChange={() => onToggleC(item)} className="size-3.5 shrink-0" />
                {item}
              </label>
            ))}
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-3">
          <div className="space-y-1.5">
            <p className="text-[14px] font-semibold" style={{ color: P.ink }}>Intensity</p>
            <div className="flex gap-2">
              {INTENSITIES.map(v => (
                <button
                  key={v}
                  type="button"
                  onClick={() => onIntensity(v)}
                  className={`flex-1 rounded-lg border-2 py-3 text-[14px] font-semibold transition-colors min-h-[44px] ${
                    draft.intensity === v
                      ? v === "High"   ? "border-red-500 bg-red-50 text-red-800"
                      : v === "Medium" ? "border-amber-500 bg-amber-50 text-amber-800"
                      :                  "border-slate-400 bg-slate-50 text-slate-800"
                      : "border-border hover:border-muted-foreground/50"
                  }`}
                >
                  {v}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-1.5">
            <p className="text-[14px] font-semibold" style={{ color: P.ink }}>Duration</p>
            <div className="grid grid-cols-3 gap-1.5">
              {DURATIONS.map(v => (
                <button
                  key={v}
                  type="button"
                  onClick={() => onDuration(v)}
                  className={`rounded-lg border-2 py-2.5 text-[14px] font-semibold transition-colors min-h-[44px] ${
                    draft.duration === v
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border hover:border-muted-foreground/50"
                  }`}
                >
                  {v}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Navigation */}
      <div className="flex items-center justify-between pt-1">
        <button type="button" onClick={onCancel} className="text-[14px] hover:underline underline-offset-2" style={{ color: P.soft }}>
          Cancel
        </button>
        <div className="flex gap-2">
          {step > 1 && (
            <Button variant="outline" size="sm" onClick={() => onStep(step - 1)}>Back</Button>
          )}
          {step < 3 ? (
            <Button size="sm" disabled={!canNext} onClick={() => onStep(step + 1)}>Next</Button>
          ) : (
            <Button size="sm" disabled={!canSave} onClick={onSave}>Save entry</Button>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export function SessionViewPage() {
  const isDemo = useDemo()
  const { sessionId } = useParams<{ sessionId: string }>()
  const [searchParams] = useSearchParams()
  const newClientId = searchParams.get("clientId")
  const routerLocation = useLocation()
  const bootstrap = (routerLocation.state as SessionPageBootstrap | null) ?? null
  const bootstrapClientId = bootstrap?.client?.id
  const bootstrapStaffId = bootstrap?.staffId
  const navigate = useNavigate()

  // ── Data resolution ────────────────────────────────────────────────────────
  const [sessionDetail, setSessionDetail] = useState<SessionDetail | null>(null)
  const [goals, setGoals] = useState<GoalRecord[]>([])
  const [clientDetail, setClientDetail] = useState<ClientDetail | null>(null)
  const [behaviors, setBehaviors] = useState<BehaviorRecord[]>([])
  const [dataLoading, setDataLoading] = useState(true)
  const [dataError, setDataError] = useState(false)
  const practiceIdRef = useRef<string>("")

  useEffect(() => {
    if (!sessionId) { setDataLoading(false); return }
    let cancelled = false
    setDataLoading(true)
    setDataError(false)
    setSessionDetail(null)

    async function loadClientContext(client: ClientDetail, staffId = "") {
      setSessionDetail(
        isNewSessionRoute(sessionId)
          ? buildNewSessionDetail(client, staffId)
          : buildSessionDetailFromBootstrap(sessionId!, { client, staffId }),
      )
      setClientDetail(client)
      const [goalRows, behaviorRows] = await Promise.all([
        getGoalsByClientId(client.id),
        getBehaviorsByClientId(client.id),
      ])
      if (cancelled) return
      setGoals(goalRows.filter(g => g.status === "in-progress" || g.status === "hold"))
      setBehaviors(behaviorRows)
    }

    async function resolveClient(clientId: string): Promise<ClientDetail | null> {
      if (bootstrap?.client.id === clientId) {
        return bootstrap.client
      }

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return null

      const membership = await getUserPractice(user.id)
      if (membership) {
        practiceIdRef.current = membership.practice_id
        const scoped = await getClientById(clientId, { practiceId: membership.practice_id })
        if (scoped) return scoped
      }

      return getClientById(clientId)
    }

    async function loadNewSession(clientId: string) {
      const client = await resolveClient(clientId)
      if (cancelled) return
      if (!client) {
        setDataError(true)
        return
      }
      await loadClientContext(client, bootstrap?.staffId ?? "")

      if (!practiceIdRef.current) {
        supabase.auth.getUser().then(({ data }) => {
          if (!data.user) return
          getUserPractice(data.user.id).then(m => {
            if (m) practiceIdRef.current = m.practice_id
          }).catch(() => {})
        }).catch(() => {})
      }
    }

    if (isNewSessionRoute(sessionId)) {
      const clientId = isValidSessionId(newClientId)
        ? newClientId
        : bootstrap?.client.id

      if (!isValidSessionId(clientId)) {
        setDataLoading(false)
        setDataError(true)
        return () => { cancelled = true }
      }

      loadNewSession(clientId)
        .catch(() => { if (!cancelled) setDataError(true) })
        .finally(() => { if (!cancelled) setDataLoading(false) })
      return () => { cancelled = true }
    }

    getSessionById(sessionId)
      .then(async (s) => {
        if (cancelled) return

        if (!s) {
          if (bootstrap?.client && isValidSessionId(sessionId)) {
            await loadClientContext(bootstrap.client, bootstrap.staffId ?? "")
            return
          }
          setDataError(true)
          return
        }

        setSessionDetail(s)
        const [goalRows, client, behaviorRows] = await Promise.all([
          getGoalsByClientId(s.clientId),
          resolveClient(s.clientId),
          getBehaviorsByClientId(s.clientId),
        ])
        if (cancelled) return
        setGoals(goalRows.filter(g => g.status === "in-progress" || g.status === "hold"))
        setClientDetail(client ?? bootstrap?.client ?? null)
        setBehaviors(behaviorRows)

        supabase.auth.getUser().then(({ data }) => {
          if (!data.user) return
          getUserPractice(data.user.id).then(m => {
            if (m) practiceIdRef.current = m.practice_id
          }).catch(() => {})
        }).catch(() => {})
      })
      .catch(() => { if (!cancelled) setDataError(true) })
      .finally(() => { if (!cancelled) setDataLoading(false) })

    return () => { cancelled = true }
  }, [sessionId, newClientId, bootstrapClientId, bootstrapStaffId])

  useEffect(() => {
    setCounts(prev => {
      const next = { ...prev }
      for (const b of behaviors) {
        if (!(b.id in next)) next[b.id] = 0
      }
      return next
    })
  }, [behaviors])

  const clientProfilePath = clientDetail?.external_code ?? sessionDetail?.clientId ?? ""
  const displayName = sessionDetail?.clientName ?? "Session"
  const isEphemeralSession = isNewSessionRoute(sessionId)

  // ── Mode ───────────────────────────────────────────────────────────────────
  const [mode, setMode] = useState<"active" | "post">("active")

  // ── Timer key — cleared on submit (no on-screen clock) ───────────────────
  const timerKey = sessionId ? `session_timer_${sessionId}` : null

  useEffect(() => {
    if (timerKey && !sessionStorage.getItem(timerKey)) {
      sessionStorage.setItem(timerKey, String(Date.now()))
    }
  }, [timerKey])

  // ── Session metadata ───────────────────────────────────────────────────────
  const [location, setLocation] = useState("")
  const [locationError, setLocationError] = useState(false)
  const [attendees, setAttendees] = useState<Set<string>>(new Set(["Client"]))

  function toggleAttendee(name: string) {
    setAttendees(prev => {
      const next = new Set(prev)
      if (next.has(name)) next.delete(name); else next.add(name)
      return next
    })
  }

  // ── Behavior tracking ──────────────────────────────────────────────────────
  const [counts, setCounts] = useState<Record<string, number>>(() =>
    Object.fromEntries(behaviors.map(b => [b.id, 0]))
  )
  const [abcOpenId, setAbcOpenId] = useState<string | null>(null)
  const [abcStep, setAbcStep] = useState(1)
  const [abcDraft, setAbcDraft] = useState<ABCDraft>({ antecedents: [], consequences: [], intensity: "", duration: "" })
  const [abcEntries, setAbcEntries] = useState<Record<string, ABCEntry[]>>({})

  function openABC(id: string) {
    setAbcOpenId(id)
    setAbcStep(1)
    setAbcDraft({ antecedents: [], consequences: [], intensity: "", duration: "" })
  }

  function toggleABCItem(field: "antecedents" | "consequences", item: string) {
    setAbcDraft(prev => {
      const list = prev[field]
      return { ...prev, [field]: list.includes(item) ? list.filter(x => x !== item) : [...list, item] }
    })
  }

  function saveABC() {
    if (!abcOpenId || !abcDraft.intensity || !abcDraft.duration) return
    const entry: ABCEntry = {
      id: `${abcOpenId}-${Date.now()}`,
      antecedents: abcDraft.antecedents,
      consequences: abcDraft.consequences,
      intensity: abcDraft.intensity as Intensity,
      duration: abcDraft.duration,
    }
    setAbcEntries(prev => ({ ...prev, [abcOpenId]: [...(prev[abcOpenId] ?? []), entry] }))
    if (!isDemo && !isEphemeralSession) {
      saveBehaviorIncident({
        practiceId:    practiceIdRef.current,
        sessionId:     sessionId!,
        clientId:      sessionDetail?.clientId ?? "",
        behaviorId:    abcOpenId,
        antecedents:   abcDraft.antecedents.length > 0 ? abcDraft.antecedents : undefined,
        consequences:  abcDraft.consequences.length > 0 ? abcDraft.consequences : undefined,
        intensity:     abcDraft.intensity,
      }).catch(() => {})
    }
    setAbcOpenId(null)
  }

  // ── Program tracking ───────────────────────────────────────────────────────
  const [selectedPrograms, setSelectedPrograms] = useState<Set<string>>(new Set())
  const [trials, setTrials] = useState<Record<string, TrialOutcome[]>>({})
  const [whyXGoal, setWhyXGoal] = useState<string | null>(null)

  function toggleProgram(id: string) {
    setSelectedPrograms(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }

  function addTrial(goalId: string, result: "correct" | "incorrect", reason?: string) {
    const trialNumber = (trials[goalId] ?? []).length + 1
    const entry: TrialOutcome = result === "correct" ? { result: "correct" } : { result: "incorrect", reason: reason ?? "Other" }
    setTrials(prev => ({ ...prev, [goalId]: [...(prev[goalId] ?? []), entry] }))
    setWhyXGoal(null)
    if (!isDemo) {
      saveTrialResult({
        sessionId:   sessionId!,
        goalId,
        practiceId:  practiceIdRef.current,
        trialNumber,
        response:    result,
      }).catch(() => {})
    }
  }

  // ── Post-session ───────────────────────────────────────────────────────────
  const [outcome, setOutcome] = useState<SessionOutcome | null>(null)
  const [cancelReason, setCancelReason] = useState("")
  const [cancelNote, setCancelNote] = useState("")
  const [soap, setSoap] = useState({ subjective: "", objective: "", action: "", plan: "" })
  const [signatureCaptured, setSignatureCaptured] = useState(false)
  const [staffSignatureCaptured, setStaffSignatureCaptured] = useState(false)

  const soapFilled = SOAP_FIELDS.every(f => soap[f.key].trim().length > 0)
  const isCancelled = outcome === "cancelled" || outcome === "no-show"
  const canSubmit = isCancelled
    ? cancelReason.trim().length > 0
    : soapFilled && signatureCaptured && staffSignatureCaptured

  function finishSession(message: string) {
    if (timerKey) sessionStorage.removeItem(timerKey)
    toast.success(message)
    navigate("/?refresh=notes")
  }

  function handleSubmitSession() {
    if (isCancelled) {
      finishSession("Session recorded.")
      return
    }
    if (isDemo || isEphemeralSession) {
      finishSession("Session note submitted.")
      return
    }
    submitSessionNote({
      practiceId: practiceIdRef.current,
      sessionId:  sessionId!,
      clientId:   sessionDetail!.clientId,
      staffId:    sessionDetail!.staffId,
      subjective: soap.subjective,
      objective:  soap.objective,
      assessment: soap.action,
      plan:       soap.plan,
    }).catch(() => {})
    completeSession(sessionId!).catch(() => {})
    finishSession("Session note submitted.")
  }

  // ─────────────────────────────────────────────────────────────────────────
  if (dataLoading) {
    return (
      <div
        className="min-h-svh flex items-center justify-center text-[15px]"
        style={{ backgroundColor: P.bg, color: P.soft }}
      >
        Loading session…
      </div>
    )
  }

  if (dataError || !sessionDetail) {
    return (
      <div
        className="min-h-svh flex flex-col items-center justify-center gap-3 px-6 text-center text-[15px]"
        style={{ backgroundColor: P.bg, color: P.soft }}
      >
        <p style={{ color: P.ink }}>Could not open this session.</p>
        <Link to="/" className="font-semibold hover:underline" style={{ color: P.sageInk }}>
          Back to dashboard
        </Link>
      </div>
    )
  }

  return (
    <div
      className="min-h-svh flex flex-col px-6 py-6 sm:px-10"
      style={{ backgroundColor: P.bg, color: P.ink }}
    >

      {/* ══ STICKY HEADER ══════════════════════════════════════════════════ */}
      <header className="sticky top-0 z-20 pb-5" style={{ backgroundColor: P.bg }}>
        <div className={PAGE_MAX}>
          <Link
            to={clientProfilePath ? `/clients/${clientProfilePath}` : "/"}
            className="inline-flex items-center gap-1.5 text-[15px] transition-opacity hover:opacity-80"
            style={{ color: P.soft }}
          >
            <ArrowLeft className="size-4" />
            Back
          </Link>

          <Link
            to={clientProfilePath ? `/clients/${clientProfilePath}` : "/"}
            className="mt-4 block text-[28px] font-semibold leading-tight tracking-tight hover:opacity-85"
            style={{ color: P.ink }}
          >
            {displayName}
          </Link>

          <div className="mt-5 flex flex-wrap items-start gap-x-8 gap-y-4">
            <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-3">
              <label className={META_LABEL} style={{ color: P.ink }}>
                Location <span style={{ color: P.cancel }}>*</span>
              </label>
              <div className="space-y-1">
                <Input
                  value={location}
                  onChange={e => { setLocation(e.target.value); if (e.target.value.trim()) setLocationError(false) }}
                  placeholder="Home / Clinic / School…"
                  className={`h-10 w-full min-w-[12rem] sm:w-52 text-[15px] ${locationError ? "border-red-500 focus-visible:ring-red-500" : ""}`}
                  style={{ backgroundColor: P.inset, borderColor: P.rule, color: P.ink }}
                />
                {locationError && (
                  <p className="text-[13px]" style={{ color: P.cancel }}>
                    Location is required before ending the session.
                  </p>
                )}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span className={META_LABEL} style={{ color: P.ink }}>Attendees</span>
              <span
                className="inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-[14px] font-semibold"
                style={{ backgroundColor: P.sageBg, color: P.sageInk, border: `1px solid ${P.sage}` }}
              >
                ✓ Client
              </span>
              {ATTENDEE_OPTIONS.map(a => (
                <button
                  key={a}
                  type="button"
                  onClick={() => toggleAttendee(a)}
                  className="inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-[14px] font-semibold transition-opacity hover:opacity-85 min-h-[36px]"
                  style={
                    attendees.has(a)
                      ? { backgroundColor: P.sageBg, color: P.sageInk, border: `1px solid ${P.sage}` }
                      : { backgroundColor: P.inset, color: P.ink, border: `1px solid ${P.rule}` }
                  }
                >
                  {attendees.has(a) ? "✓" : "+"} {a}
                </button>
              ))}
            </div>
          </div>
        </div>
      </header>

      {/* ══ ACTIVE SESSION ══════════════════════════════════════════════════ */}
      {mode === "active" && (
        <>
          <main className={`flex-1 ${PAGE_MAX} py-6`}>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">

              {/* ── LEFT: Behaviors ── */}
              <section className="space-y-4">
                <h2 className={TILE_TITLE} style={{ color: P.ink }}>Behaviors</h2>

                {behaviors.length === 0 ? (
                  <Card className="border-0 shadow-card" style={{ backgroundColor: P.card, borderRadius: P.radius }}>
                    <CardContent className={`py-10 text-center ${BODY_TEXT}`} style={{ color: P.soft }}>
                      No behaviors configured for this client.
                    </CardContent>
                  </Card>
                ) : behaviors.map(behavior => (
                  <Card key={behavior.id} className="border-0 shadow-card" style={{ backgroundColor: P.card, borderRadius: P.radius }}>
                    <CardHeader className="pb-2">
                      <CardTitle className={TILE_TITLE} style={{ color: P.ink }}>{behavior.name}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">

                      {/* Counter */}
                      <div className="flex items-center gap-5">
                        <button
                          onClick={() => setCounts(p => ({ ...p, [behavior.id]: Math.max(0, (p[behavior.id] ?? 0) - 1) }))}
                          className="flex items-center justify-center size-12 rounded-full border-2 border-border hover:bg-muted transition-colors"
                          aria-label="Decrease"
                        >
                          <Minus className="size-5" />
                        </button>
                        <span className="text-5xl font-bold tabular-nums w-14 text-center">
                          {counts[behavior.id] ?? 0}
                        </span>
                        <button
                          onClick={() => setCounts(p => ({ ...p, [behavior.id]: (p[behavior.id] ?? 0) + 1 }))}
                          className="flex items-center justify-center size-12 rounded-full border-2 border-primary bg-primary/10 hover:bg-primary/20 transition-colors text-primary"
                          aria-label="Increase"
                        >
                          <Plus className="size-5" />
                        </button>
                      </div>

                      {/* Saved ABC entries */}
                      {(abcEntries[behavior.id] ?? []).length > 0 && (
                        <div className="space-y-1.5">
                          {(abcEntries[behavior.id]).map(entry => (
                            <div key={entry.id} className="rounded-lg px-3 py-2.5 text-[14px] space-y-0.5" style={{ backgroundColor: P.inset }}>
                              <p className={`font-semibold ${
                                entry.intensity === "High"   ? "text-red-700" :
                                entry.intensity === "Medium" ? "text-amber-700" : "text-slate-700"
                              }`}>
                                {entry.intensity} intensity · {entry.duration}
                              </p>
                              {entry.antecedents.length > 0 && (
                                <p className="text-muted-foreground"><span className="font-medium text-foreground">A:</span> {entry.antecedents.join(", ")}</p>
                              )}
                              {entry.consequences.length > 0 && (
                                <p className="text-muted-foreground"><span className="font-medium text-foreground">C:</span> {entry.consequences.join(", ")}</p>
                              )}
                            </div>
                          ))}
                        </div>
                      )}

                      {/* ABC Flow or trigger */}
                      {abcOpenId === behavior.id ? (
                        <ABCFlow
                          step={abcStep}
                          draft={abcDraft}
                          onStep={setAbcStep}
                          onToggleA={item => toggleABCItem("antecedents", item)}
                          onToggleC={item => toggleABCItem("consequences", item)}
                          onIntensity={v => setAbcDraft(p => ({ ...p, intensity: v }))}
                          onDuration={v => setAbcDraft(p => ({ ...p, duration: v }))}
                          onSave={saveABC}
                          onCancel={() => setAbcOpenId(null)}
                        />
                      ) : (
                        <button
                          type="button"
                          onClick={() => openABC(behavior.id)}
                          className="text-[14px] font-semibold hover:underline underline-offset-2"
                          style={{ color: P.sageInk }}
                        >
                          + Add ABC context
                        </button>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </section>

              {/* ── RIGHT: Programs ── */}
              <section className="space-y-4">
                <h2 className={TILE_TITLE} style={{ color: P.ink }}>Today&apos;s programs</h2>

                {/* Selector */}
                <Card className="border-0 shadow-card" style={{ backgroundColor: P.card, borderRadius: P.radius }}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-[16px] font-semibold" style={{ color: P.ink }}>
                      Select programs to run today
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {goals.length === 0 ? (
                      <p className={BODY_TEXT} style={{ color: P.soft }}>No goals on file for this client.</p>
                    ) : (
                      <div className="space-y-1">
                        {goals.map(goal => (
                          <label
                            key={goal.id}
                            className="flex items-center gap-3 rounded-lg px-1 py-2.5 cursor-pointer transition-opacity hover:opacity-85 min-h-[44px]"
                          >
                            <input
                              type="checkbox"
                              checked={selectedPrograms.has(goal.id)}
                              onChange={() => toggleProgram(goal.id)}
                              className="size-4 rounded shrink-0"
                            />
                            <span className="text-[16px] flex-1" style={{ color: P.ink }}>{goal.name}</span>
                            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[12px] font-semibold shrink-0 ${GOAL_STATUS_CONFIG[goal.status as GoalStatus].className}`}>
                              {GOAL_STATUS_CONFIG[goal.status as GoalStatus].label}
                            </span>
                          </label>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Program cards */}
                {[...selectedPrograms].map(goalId => {
                  const goal = goals.find(g => g.id === goalId)
                  if (!goal) return null
                  const ts = trials[goalId] ?? []
                  const correct = ts.filter(t => t.result === "correct").length
                  const p = calcPct(ts)

                  return (
                    <Card key={goalId} className="border-0 shadow-card" style={{ backgroundColor: P.card, borderRadius: P.radius }}>
                      <CardHeader className="pb-1">
                        <CardTitle className={TILE_TITLE} style={{ color: P.ink }}>{goal.name}</CardTitle>
                        <p className="text-[14px] mt-1" style={{ color: P.soft }}>{goal.masteryTarget}</p>
                      </CardHeader>
                      <CardContent className="space-y-3">

                        {/* Count + live % */}
                        <div className="flex items-baseline gap-2">
                          <span className="text-2xl font-bold tabular-nums">{correct}/{ts.length}</span>
                          <span className="text-[15px]" style={{ color: P.soft }}>correct</span>
                          <span className={`ml-auto text-2xl font-bold tabular-nums ${
                            p >= 80 ? "text-emerald-600" : p >= 60 ? "text-amber-600" : "text-red-600"
                          }`}>
                            {p}%
                          </span>
                        </div>

                        {/* Trial buttons */}
                        <div className="grid grid-cols-2 gap-3">
                          <button
                            type="button"
                            onClick={() => addTrial(goalId, "correct")}
                            className="flex items-center justify-center gap-2 rounded-xl border-2 border-emerald-400 bg-emerald-50 py-3.5 text-[15px] font-semibold text-emerald-800 hover:bg-emerald-100 active:scale-95 transition-all min-h-[56px]"
                          >
                            <Check className="size-4" /> Correct
                          </button>
                          <button
                            type="button"
                            onClick={() => setWhyXGoal(g => g === goalId ? null : goalId)}
                            className="flex items-center justify-center gap-2 rounded-xl border-2 border-red-400 bg-red-50 py-3.5 text-[15px] font-semibold text-red-800 hover:bg-red-100 active:scale-95 transition-all min-h-[56px]"
                          >
                            <X className="size-4" /> Incorrect
                          </button>
                        </div>

                        {/* Why X? inline picker */}
                        {whyXGoal === goalId && (
                          <div className="rounded-xl border p-3 space-y-2" style={{ backgroundColor: P.inset, borderColor: P.rule }}>
                            <p className="text-[14px] font-semibold" style={{ color: P.ink }}>Why incorrect?</p>
                            <div className="grid grid-cols-2 gap-1.5">
                              {WHY_X_REASONS.map(reason => (
                                <button
                                  key={reason}
                                  type="button"
                                  onClick={() => addTrial(goalId, "incorrect", reason)}
                                  className="text-[14px] text-left rounded-lg border px-3 py-2 hover:opacity-85 transition-opacity min-h-[44px]"
                                  style={{ backgroundColor: P.card, borderColor: P.rule, color: P.ink }}
                                >
                                  {reason}
                                </button>
                              ))}
                            </div>
                            <button
                              type="button"
                              onClick={() => setWhyXGoal(null)}
                              className="text-[14px] hover:underline underline-offset-2"
                              style={{ color: P.soft }}
                            >
                              Cancel
                            </button>
                          </div>
                        )}

                        {/* Trial history dots */}
                        {ts.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 pt-1">
                            {ts.map((t, i) => (
                              <span
                                key={i}
                                title={t.result === "incorrect" ? t.reason : "Correct"}
                                className={`size-7 rounded-full flex items-center justify-center text-[11px] font-bold ${
                                  t.result === "correct" ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"
                                }`}
                              >
                                {t.result === "correct" ? "✓" : "✗"}
                              </span>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  )
                })}
              </section>
            </div>
          </main>

          {/* End Session — sticky footer */}
          <div
            className="sticky bottom-0 z-10 border-t -mx-6 px-6 py-4 sm:-mx-10 sm:px-10"
            style={{ backgroundColor: P.card, borderColor: P.rule }}
          >
            <div className={PAGE_MAX}>
              <Button
                size="lg"
                variant="destructive"
                className="w-full text-[16px] font-semibold py-6"
                onClick={() => {
                  if (!location.trim()) { setLocationError(true); return }
                  setMode("post")
                }}
              >
                End Session
              </Button>
            </div>
          </div>
        </>
      )}

      {/* ══ POST-SESSION ════════════════════════════════════════════════════ */}
      {mode === "post" && (
        <main className={`flex-1 ${PAGE_MAX} py-6 space-y-6`}>

          {/* Step 1 — Outcome selector */}
          <Card className="border-0 shadow-card max-w-3xl" style={{ backgroundColor: P.card, borderRadius: P.radius }}>
            <CardHeader>
              <CardTitle className={TILE_TITLE} style={{ color: P.ink }}>How did the session go?</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3">
                {SESSION_OUTCOMES.map(o => (
                  <button
                    key={o.key}
                    onClick={() => {
                      setOutcome(o.key)
                      setSignatureCaptured(false)
                      setStaffSignatureCaptured(false)
                    }}
                    className={`rounded-xl border-2 px-4 py-4 text-left transition-colors min-h-[80px] ${
                      outcome === o.key ? o.ring : "border-border hover:border-muted-foreground/40"
                    }`}
                  >
                    <p className="font-semibold text-[15px]" style={{ color: P.ink }}>{o.label}</p>
                    <p className="text-[14px] mt-0.5" style={{ color: P.soft }}>{o.description}</p>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Step 2a — Cancellation / No-show form */}
          {isCancelled && (
            <Card>
              <CardHeader>
                <CardTitle>Cancellation details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Reason <span className="text-red-500">*</span></label>
                  <Input
                    value={cancelReason}
                    onChange={e => setCancelReason(e.target.value)}
                    placeholder="e.g. Client illness, family emergency"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">
                    Internal note <span className="text-muted-foreground font-normal">(optional)</span>
                  </label>
                  <Textarea
                    value={cancelNote}
                    onChange={e => setCancelNote(e.target.value)}
                    placeholder="Any additional context for the clinical record…"
                  />
                </div>
                <Button
                  size="lg"
                  className="w-full"
                  disabled={!canSubmit}
                  onClick={handleSubmitSession}
                >
                  Submit
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Step 2b — SOAP + signature */}
          {(outcome === "occurred" || outcome === "shortened") && (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>Session note (SOAP)</CardTitle>
                </CardHeader>
                <CardContent className="space-y-5">
                  {SOAP_FIELDS.map(field => (
                    <div key={field.key} className="space-y-1.5">
                      <p className="text-sm font-semibold">{field.label}</p>
                      <p className="text-xs text-muted-foreground">{field.prompt}</p>
                      <Textarea
                        value={soap[field.key]}
                        onChange={e => setSoap(p => ({ ...p, [field.key]: e.target.value }))}
                        placeholder="Write at least one sentence…"
                      />
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Signatures</CardTitle>
                </CardHeader>
                <CardContent className="space-y-5">
                  <SignaturePad
                    label="Caregiver signature"
                    disabled={!soapFilled}
                    captured={signatureCaptured}
                    onCapture={() => setSignatureCaptured(true)}
                    onClear={() => setSignatureCaptured(false)}
                  />

                  <SignaturePad
                    label="Staff signature"
                    disabled={!soapFilled}
                    captured={staffSignatureCaptured}
                    onCapture={() => setStaffSignatureCaptured(true)}
                    onClear={() => setStaffSignatureCaptured(false)}
                  />

                  <Button
                    size="lg"
                    className="w-full"
                    disabled={!canSubmit}
                    onClick={handleSubmitSession}
                  >
                    Submit Session
                  </Button>
                </CardContent>
              </Card>
            </>
          )}
        </main>
      )}
    </div>
  )
}
