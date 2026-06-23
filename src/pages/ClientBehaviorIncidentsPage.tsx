import { useEffect, useState } from "react"
import { ChevronDown, ChevronRight } from "lucide-react"
import { ArrowLeft } from "lucide-react"
import { Link, useParams } from "react-router-dom"
import { formatEventStamp } from "@/lib/sessions"
import { resolveClientByRouteKey } from "@/lib/rosterScope"
import {
  getBehaviorIncidentsByClientId,
  type BehaviorIncidentRecord,
} from "@/lib/supabase"
import { P } from "@/pages/ClientOverviewPage/profileTokens"
import { formatClientDisplayName } from "@/pages/ClientOverviewPage/clientProfileUtils"

function formatDuration(seconds: number | null): string {
  if (seconds === null || seconds === undefined) return "Not on file"
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  if (m === 0) return `${s}s`
  return s === 0 ? `${m}m` : `${m}m ${s}s`
}

const INTENSITY_CHIP: Record<string, { bg: string; ink: string }> = {
  High: { bg: "#F4E6DD", ink: P.cancel },
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
      className="py-3.5 first:pt-0"
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
          <div className="flex flex-wrap items-baseline gap-2">
            <span className="text-sm font-medium" style={{ color: P.ink }}>
              {date}
            </span>
            <span className="text-xs" style={{ color: P.faint }}>
              {time}
            </span>
            <span className="text-sm font-semibold" style={{ color: P.ink }}>
              {behaviorName}
            </span>
            {intensity && incident.intensity && (
              <span
                className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium"
                style={{ backgroundColor: intensity.bg, color: intensity.ink }}
              >
                {incident.intensity}
              </span>
            )}
          </div>
        </div>
      </button>

      {open && (
        <dl className="mt-3 ml-6 grid grid-cols-[6rem_1fr] gap-x-4 gap-y-3 text-sm">
          {[
            { label: "Antecedents", value: antecedentsStr },
            { label: "Consequences", value: consequencesStr },
            { label: "Duration", value: formatDuration(incident.duration_seconds) },
          ].map(({ label, value }) => (
            <div key={label} className="contents">
              <dt
                className="pt-0.5 text-[11px] font-semibold uppercase tracking-[0.06em]"
                style={{ color: P.faint }}
              >
                {label}
              </dt>
              <dd style={{ color: P.soft }}>{value}</dd>
            </div>
          ))}
        </dl>
      )}
    </li>
  )
}

export function ClientBehaviorIncidentsPage({ practiceId }: { practiceId: string }) {
  const { clientId: clientRouteKey } = useParams<{ clientId: string }>()
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [displayName, setDisplayName] = useState("")
  const [incidents, setIncidents] = useState<BehaviorIncidentRecord[]>([])

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

  if (!loading && notFound) {
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
    <div className="min-h-svh px-4 py-6" style={{ backgroundColor: P.bg, color: P.ink }}>
      <div className="mx-auto w-full max-w-3xl">
        <Link
          to={clientRouteKey ? `/clients/${encodeURIComponent(clientRouteKey)}` : "/"}
          className="inline-flex items-center gap-1.5 text-sm transition-opacity hover:opacity-80"
          style={{ color: P.soft }}
        >
          <ArrowLeft className="size-4" />
          Back to client profile
        </Link>

        <header className="mt-6">
          <h1 className="text-2xl font-semibold tracking-tight">
            {loading ? (
              <span className="animate-pulse" style={{ color: P.faint }}>
                Loading…
              </span>
            ) : (
              displayName
            )}
          </h1>
          <p className="mt-1 text-sm" style={{ color: P.soft }}>
            Behavior incidents
          </p>
        </header>

        <section
          className="mt-6 p-5"
          style={{ backgroundColor: P.card, borderRadius: P.radius }}
        >
          {loading ? (
            <p className="py-8 text-center text-sm animate-pulse" style={{ color: P.faint }}>
              Loading…
            </p>
          ) : incidents.length === 0 ? (
            <p className="py-8 text-center text-sm" style={{ color: P.soft }}>
              No behavior incidents recorded.
            </p>
          ) : (
            <ul>
              {incidents.map((incident, index) => (
                <li
                  key={incident.id}
                  className={index === 0 ? "[&>li]:border-t-0" : undefined}
                >
                  <BehaviorIncidentRow incident={incident} />
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  )
}
