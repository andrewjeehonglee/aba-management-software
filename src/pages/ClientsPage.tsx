import { useEffect, useMemo, useState } from "react"
import { AlertCircle } from "lucide-react"
import { Link } from "react-router-dom"
import { OwnerAppShell } from "@/components/dashboard/OwnerAppShell"
import { useOwnerShell } from "@/hooks/useOwnerShell"
import { getBcbaSummaries, getRosterRows, type BcbaSummary, type RosterRow } from "@/lib/rosterTable"
import { clientProfilePath, staffProfilePath } from "@/lib/rosterScope"

const TEAM_GRID =
  "grid grid-cols-[minmax(4.5rem,auto)_minmax(7rem,auto)_minmax(7rem,auto)_minmax(7rem,auto)] items-center gap-x-5"

function UnassignedChip() {
  return (
    <span className="inline-flex items-center gap-1 text-[14px] text-alert">
      <AlertCircle className="size-3.5 shrink-0" aria-hidden />
      Unassigned
    </span>
  )
}

function StaffName({ name, code }: { name: string; code?: string | null }) {
  if (!code) return <span className="text-[14px] text-ink">{name}</span>
  return (
    <Link
      to={staffProfilePath(code)}
      className="text-[14px] text-ink hover:text-brand hover:underline underline-offset-2"
      onClick={(e) => e.stopPropagation()}
    >
      {name}
    </Link>
  )
}

function TeamColumnHeader() {
  return (
    <div
      className={`${TEAM_GRID} px-4 pb-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted`}
      aria-hidden
    >
      <span>Client</span>
      <span>BCBA</span>
      <span>Clinical supervisor</span>
      <span>Technician</span>
    </div>
  )
}

function ClientTeamRow({ row }: { row: RosterRow }) {
  const showDisplayName =
    row.clientDisplayName.toLowerCase() !== row.clientCode.toLowerCase()

  return (
    <Link
      to={clientProfilePath(row.clientCode)}
      className={`${TEAM_GRID} rounded-[14px] border border-line/80 bg-surface px-4 py-3 transition-colors hover:border-brand/25 hover:bg-surface-2`}
    >
      <div className="min-w-0">
        <p className="text-[15px] font-semibold text-ink">{row.clientCode}</p>
        {showDisplayName && (
          <p className="mt-0.5 truncate text-[13px] text-muted">{row.clientDisplayName}</p>
        )}
      </div>
      <div className="min-w-0">
        {row.bcbaName ? (
          <StaffName name={row.bcbaName} code={row.bcbaCode} />
        ) : (
          <span className="text-[14px] text-muted">—</span>
        )}
      </div>
      <div className="min-w-0">
        {row.supervisorName ? (
          <StaffName name={row.supervisorName} code={row.supervisorCode} />
        ) : (
          <span className="text-[14px] text-muted">—</span>
        )}
      </div>
      <div className="min-w-0">
        {row.btUnassigned ? (
          <UnassignedChip />
        ) : row.btName ? (
          <StaffName name={row.btName} code={row.btCode} />
        ) : (
          <span className="text-[14px] text-muted">—</span>
        )}
      </div>
    </Link>
  )
}

function BcbaTeamSection({
  summary,
  clients,
}: {
  summary: BcbaSummary
  clients: RosterRow[]
}) {
  return (
    <section className="w-fit max-w-full">
      <div className="mb-3 flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h2 className="text-[18px] font-semibold text-ink">{summary.fullName}</h2>
        <p className="text-[15px] text-muted">
          {clients.length} client{clients.length === 1 ? "" : "s"}
          {summary.unassignedBtCount > 0 && (
            <>
              {" · "}
              <span className="text-alert">
                {summary.unassignedBtCount} unassigned technician
                {summary.unassignedBtCount === 1 ? "" : "s"}
              </span>
            </>
          )}
        </p>
      </div>
      <TeamColumnHeader />
      <ul className="space-y-2">
        {clients.map((row) => (
          <li key={row.clientId}>
            <ClientTeamRow row={row} />
          </li>
        ))}
      </ul>
    </section>
  )
}

export function ClientsPage({
  practiceId,
  userRole,
}: {
  practiceId: string
  userRole?: string
}) {
  const { ownerName, practiceName } = useOwnerShell(practiceId, userRole)
  const [allRows, setAllRows] = useState<RosterRow[]>([])
  const [bcbaSummaries, setBcbaSummaries] = useState<BcbaSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(false)

    Promise.all([getRosterRows(practiceId), getBcbaSummaries(practiceId)])
      .then(([rows, summaries]) => {
        if (cancelled) return
        setAllRows(rows)
        setBcbaSummaries(summaries)
      })
      .catch(() => {
        if (!cancelled) setError(true)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [practiceId])

  const teamsByBcba = useMemo(() => {
    const sortedSummaries = [...bcbaSummaries].sort((a, b) =>
      a.fullName.localeCompare(b.fullName, undefined, { sensitivity: "base" }),
    )

    return sortedSummaries.map((summary) => {
      const clients = allRows
        .filter((row) => row.bcbaId === summary.staffId)
        .sort((a, b) =>
          a.clientCode.localeCompare(b.clientCode, undefined, { sensitivity: "base" }),
        )
      return { summary, clients }
    })
  }, [allRows, bcbaSummaries])

  const hasRoster = allRows.length > 0

  return (
    <OwnerAppShell ownerName={ownerName} practiceName={practiceName}>
      <div className="flex min-h-0 flex-1 flex-col">
        <header className="mb-6 shrink-0 short:mb-4">
          <h1 className="text-[clamp(1.75rem,3vw,2.25rem)] font-semibold tracking-[-0.02em] text-ink">
            Clients
          </h1>
          <p className="mt-1.5 text-[16px] text-muted">
            {hasRoster
              ? `${allRows.length} active client${allRows.length === 1 ? "" : "s"}`
              : "Active client care teams"}
          </p>
        </header>

        <div className="owner-scroll min-h-0 flex-1 overflow-y-auto pr-1">
          {loading && (
            <p className="py-16 text-center text-[15px] text-muted animate-pulse">Loading clients…</p>
          )}

          {error && (
            <div className="rounded-[var(--radius)] bg-surface p-8 text-center shadow-card">
              <p className="text-[15px] text-alert">Could not load clients. Please refresh and try again.</p>
            </div>
          )}

          {!loading && !error && !hasRoster && (
            <div className="rounded-[var(--radius)] bg-surface p-8 shadow-card">
              <h2 className="text-[17px] font-semibold text-ink">No roster imported yet</h2>
              <p className="mt-2 text-[15px] text-muted">
                Import your caseload from{" "}
                <code className="rounded bg-surface-2 px-1.5 py-0.5 text-[13px]">
                  templates/roster_import.csv
                </code>
                .
              </p>
            </div>
          )}

          {!loading && !error && hasRoster && (
            <div className="space-y-8">
              {teamsByBcba.map(({ summary, clients }) => (
                <BcbaTeamSection key={summary.staffId} summary={summary} clients={clients} />
              ))}
            </div>
          )}
        </div>
      </div>
    </OwnerAppShell>
  )
}
