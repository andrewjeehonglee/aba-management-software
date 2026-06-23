import { useEffect, useMemo, useState } from "react"
import { ArrowLeft, ChevronDown, ChevronRight } from "lucide-react"
import { Link, useParams } from "react-router-dom"
import { formatEventStamp } from "@/lib/sessions"
import { clientProfilePath, resolveClientByRouteKey } from "@/lib/rosterScope"
import {
  getBehaviorIncidentsByClientId,
  type BehaviorIncidentRecord,
} from "@/lib/supabase"
import { formatClientDisplayName } from "@/pages/ClientOverviewPage/clientProfileUtils"
import { P, SECTION_LABEL } from "@/pages/ClientOverviewPage/profileTokens"

function formatDateInput(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, "0")
  const d = String(date.getDate()).padStart(2, "0")
  return `${y}-${m}-${d}`
}

function defaultDateRange(days: number): { startDate: string; endDate: string } {
  const end = new Date()
  const start = new Date()
  start.setDate(start.getDate() - (days - 1))
  return { startDate: formatDateInput(start), endDate: formatDateInput(end) }
}

type DatePreset = "7" | "14" | "30"

const DATE_PRESETS: { id: DatePreset; label: string; days: number }[] = [
  { id: "7", label: "7 days", days: 7 },
  { id: "14", label: "14 days", days: 14 },
  { id: "30", label: "1 month", days: 30 },
]

function presetForRange(startDate: string, endDate: string): DatePreset | null {
  for (const preset of DATE_PRESETS) {
    const { startDate: s, endDate: e } = defaultDateRange(preset.days)
    if (s === startDate && e === endDate) return preset.id
  }
  return null
}

function incidentAt(incident: BehaviorIncidentRecord): string | null {
  return incident.session_at ?? incident.created_at
}

function incidentInRange(
  incident: BehaviorIncidentRecord,
  startDate: string,
  endDate: string,
): boolean {
  const at = incidentAt(incident)
  if (!at) return false
  const day = at.slice(0, 10)
  return day >= startDate && day <= endDate
}

function formatDuration(seconds: number | null): string {
  if (seconds === null || seconds === undefined) return "Not on file"
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  if (m === 0) return `${s}s`
  return s === 0 ? `${m}m` : `${m}m ${s}s`
}

const INTENSITY_CHIP: Record<string, { bg: string; ink: string }> = {
  High: { bg: "#F4E6DD", ink: P.calCancelled },
  Medium: { bg: P.amberBg, ink: P.amberInk },
  Low: { bg: P.inset, ink: P.soft },
}

function BehaviorIncidentRow({ incident }: { incident: BehaviorIncidentRecord }) {
  const [open, setOpen] = useState(false)
  const { date, time } = formatEventStamp(incident.created_at, incident.session_at)
  const behaviorName = incident.behaviors?.name ?? "Unknown behavior"
  const intensity = incident.intensity ? INTENSITY_CHIP[incident.intensity] : null
  const antecedentsStr = incident.antecedents?.length
    ? incident.antecedents.join(", ")
    : "Not on file"
  const consequencesStr = incident.consequences?.length
    ? incident.consequences.join(", ")
    : "Not on file"

  return (
    <li
      className="py-4 first:pt-0"
      style={{ borderTop: `1px solid ${P.rule}` }}
    >
      <button
        type="button"
        className="flex w-full items-start gap-2 text-left"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
      >
        <span className="mt-0.5 shrink-0" style={{ color: P.faint }}>
          {open ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[16px] font-medium" style={{ color: P.ink }}>
              {date}
            </span>
            {time && (
              <span className="text-[13px]" style={{ color: P.faint }}>
                {time}
              </span>
            )}
            <span className="text-[16px] font-semibold" style={{ color: P.ink }}>
              {behaviorName}
            </span>
            {intensity && incident.intensity && (
              <span
                className="inline-flex rounded-full px-2.5 py-0.5 text-[12px] font-medium"
                style={{ backgroundColor: intensity.bg, color: intensity.ink }}
              >
                {incident.intensity}
              </span>
            )}
          </div>
        </div>
      </button>

      {open && (
        <dl className="mt-3 ml-6 grid grid-cols-[5.5rem_1fr] gap-x-4 gap-y-3 text-[14px]">
          {[
            { label: "Antecedents", value: antecedentsStr },
            { label: "Consequences", value: consequencesStr },
            { label: "Duration", value: formatDuration(incident.duration_seconds) },
          ].map(({ label, value }) => (
            <div key={label} className="contents">
              <dt className={`${SECTION_LABEL} pt-0.5`} style={{ color: P.faint }}>
                {label}
              </dt>
              <dd className="leading-relaxed" style={{ color: P.soft }}>
                {value}
              </dd>
            </div>
          ))}
        </dl>
      )}
    </li>
  )
}

export function ClientBehaviorIncidentsPage({ practiceId }: { practiceId: string }) {
  const { clientId: clientRouteKey } = useParams<{ clientId: string }>()
  const defaults = useMemo(() => defaultDateRange(14), [])
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [displayName, setDisplayName] = useState("")
  const [incidents, setIncidents] = useState<BehaviorIncidentRecord[]>([])
  const [startDate, setStartDate] = useState(defaults.startDate)
  const [endDate, setEndDate] = useState(defaults.endDate)

  useEffect(() => {
    if (!clientRouteKey) {
      setNotFound(true)
      setLoading(false)
      return
    }
    let cancelled = false
    setLoading(true)
    resolveClientByRouteKey(practiceId, clientRouteKey)
      .then(async (client) => {
        if (cancelled) return
        if (!client) {
          setNotFound(true)
          return
        }
        setDisplayName(formatClientDisplayName(client))
        const rows = await getBehaviorIncidentsByClientId(client.id)
        if (!cancelled) setIncidents(rows)
      })
      .catch(() => {
        if (!cancelled) setNotFound(true)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [clientRouteKey, practiceId])

  const filteredIncidents = useMemo(
    () =>
      incidents
        .filter((i) => incidentInRange(i, startDate, endDate))
        .sort((a, b) => (incidentAt(b) ?? "").localeCompare(incidentAt(a) ?? "")),
    [incidents, startDate, endDate],
  )

  const activePreset = presetForRange(startDate, endDate)

  function applyPreset(preset: DatePreset) {
    const match = DATE_PRESETS.find((p) => p.id === preset)
    if (!match) return
    const range = defaultDateRange(match.days)
    setStartDate(range.startDate)
    setEndDate(range.endDate)
  }

  if (notFound) {
    return (
      <div
        className="flex min-h-svh items-center justify-center text-[15px]"
        style={{ backgroundColor: P.bg, color: P.soft }}
      >
        Client not found.
      </div>
    )
  }

  const profilePath = clientRouteKey ? clientProfilePath(clientRouteKey) : "/"

  return (
    <div className="min-h-svh px-10 py-6" style={{ backgroundColor: P.bg, color: P.ink }}>
      <div className="mx-auto w-full max-w-[900px]">
        <Link
          to={profilePath}
          className="inline-flex items-center gap-1.5 text-[15px] transition-opacity hover:opacity-80"
          style={{ color: P.soft }}
        >
          <ArrowLeft className="size-4" />
          Back to client profile
        </Link>

        <header className="mt-6">
          <h1 className="text-[28px] font-semibold tracking-tight">
            {displayName || (loading ? "…" : "")}
          </h1>
          <p className="mt-2 text-[18px] font-bold" style={{ color: P.ink }}>
            Behavior incidents
          </p>
        </header>

        <section
          className="mt-6 p-5"
          style={{ backgroundColor: P.card, borderRadius: P.radius }}
        >
          <div className="flex flex-wrap items-center gap-2">
            <span className={`${SECTION_LABEL} mr-1`} style={{ color: P.faint }}>
              Range
            </span>
            {DATE_PRESETS.map((preset) => {
              const selected = activePreset === preset.id
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => applyPreset(preset.id)}
                  className="rounded-full px-3.5 py-1.5 text-[14px] font-medium transition-opacity hover:opacity-90"
                  style={{
                    backgroundColor: selected ? P.sageBg : P.inset,
                    color: selected ? P.sageInk : P.soft,
                    boxShadow: selected ? `inset 0 0 0 1px ${P.sage}` : undefined,
                  }}
                >
                  {preset.label}
                </button>
              )
            })}
          </div>

          <div className="mt-4 flex flex-wrap items-end gap-4">
            <label className="space-y-1">
              <span className={`block ${SECTION_LABEL}`} style={{ color: P.faint }}>
                Start date
              </span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="rounded-lg border px-3 py-2 text-[15px]"
                style={{ borderColor: P.rule, backgroundColor: P.inset, color: P.ink }}
              />
            </label>
            <label className="space-y-1">
              <span className={`block ${SECTION_LABEL}`} style={{ color: P.faint }}>
                End date
              </span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="rounded-lg border px-3 py-2 text-[15px]"
                style={{ borderColor: P.rule, backgroundColor: P.inset, color: P.ink }}
              />
            </label>
          </div>

          {startDate > endDate && (
            <p className="mt-3 text-[14px]" style={{ color: P.cancel }}>
              Start date must be on or before end date.
            </p>
          )}
        </section>

        <section
          className="mt-6 p-5"
          style={{ backgroundColor: P.card, borderRadius: P.radius }}
        >
          {loading ? (
            <p className="text-[15px] animate-pulse" style={{ color: P.faint }}>
              Loading…
            </p>
          ) : filteredIncidents.length === 0 ? (
            <p className="text-[15px]" style={{ color: P.soft }}>
              No behavior incidents in this date range.
            </p>
          ) : (
            <ul>
              {filteredIncidents.map((incident) => (
                <BehaviorIncidentRow key={incident.id} incident={incident} />
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  )
}
