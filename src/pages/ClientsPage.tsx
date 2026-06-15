import { useEffect, useMemo, useState } from "react"
import { AlertCircle, ArrowUpDown } from "lucide-react"
import { Link, useNavigate } from "react-router-dom"
import { OwnerAppShell } from "@/components/dashboard/OwnerAppShell"
import { useOwnerShell } from "@/hooks/useOwnerShell"
import { cn } from "@/lib/utils"
import {
  getBcbaSummaries,
  getRosterRows,
  type BcbaSummary,
  type RosterRow,
} from "@/lib/rosterTable"
import { clientProfilePath, staffProfilePath } from "@/lib/rosterScope"

type BcbaFilter = "all" | string
type SortKey = "client" | "bcba" | "supervisor" | "bt"

function compareRosterRows(
  a: RosterRow,
  b: RosterRow,
  key: SortKey,
  dir: "asc" | "desc",
): number {
  if (key === "bt") {
    if (a.btUnassigned && !b.btUnassigned) return 1
    if (!a.btUnassigned && b.btUnassigned) return -1
  }

  const value = (row: RosterRow): string => {
    switch (key) {
      case "client":
        return row.clientCode
      case "bcba":
        return row.bcbaName ?? ""
      case "supervisor":
        return row.supervisorName ?? ""
      case "bt":
        return row.btUnassigned ? "Unassigned" : (row.btName ?? "")
    }
  }

  const cmp = value(a).localeCompare(value(b), undefined, { sensitivity: "base" })
  return dir === "asc" ? cmp : -cmp
}

function SortableHeader({
  label,
  sortKey,
  activeKey,
  sortDir,
  onSort,
  className = "",
}: {
  label: string
  sortKey: SortKey
  activeKey: SortKey
  sortDir: "asc" | "desc"
  onSort: (key: SortKey) => void
  className?: string
}) {
  const isActive = activeKey === sortKey
  return (
    <th
      className={cn("py-3 pr-4 text-[13px] font-semibold uppercase tracking-[0.08em] text-muted", className)}
      aria-sort={isActive ? (sortDir === "asc" ? "ascending" : "descending") : "none"}
    >
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        className="inline-flex items-center gap-1 transition-colors hover:text-ink"
      >
        {label}
        <ArrowUpDown className={cn("size-3", isActive ? "text-brand" : "opacity-40")} aria-hidden />
      </button>
    </th>
  )
}

function UnassignedChip() {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-alert-soft px-2.5 py-0.5 text-[13px] font-semibold text-alert ring-1 ring-alert/20">
      <AlertCircle className="size-3.5 shrink-0" aria-hidden />
      Unassigned
    </span>
  )
}

function StaffLink({ name, code }: { name: string; code?: string | null }) {
  if (!code) return <span>{name}</span>
  return (
    <Link
      to={staffProfilePath(code)}
      className="text-ink hover:text-brand hover:underline underline-offset-2"
      onClick={(e) => e.stopPropagation()}
    >
      {name}
    </Link>
  )
}

function BcbaOverviewCard({
  summary,
  active,
  onSelect,
}: {
  summary: BcbaSummary
  active: boolean
  onSelect: () => void
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "w-full rounded-[16px] border p-4 text-left transition-colors",
        active
          ? "border-brand/40 bg-accent-soft ring-1 ring-brand/20"
          : "border-line bg-surface hover:border-brand/30 hover:bg-surface-2",
      )}
    >
      <p className="text-[17px] font-semibold text-brand">{summary.fullName}</p>
      <p className="mt-1 text-[14px] text-muted">
        {summary.clientCount} client{summary.clientCount === 1 ? "" : "s"}
        {" · "}
        {summary.btCount} technician{summary.btCount === 1 ? "" : "s"}
        {summary.unassignedBtCount > 0 && (
          <>
            {" · "}
            <span className="font-medium text-alert">
              {summary.unassignedBtCount} unassigned
            </span>
          </>
        )}
      </p>
    </button>
  )
}

function ClientTableRow({ row }: { row: RosterRow }) {
  const navigate = useNavigate()
  const showDisplayName =
    row.clientDisplayName.toLowerCase() !== row.clientCode.toLowerCase()

  return (
    <tr
      className="cursor-pointer border-b border-line-soft last:border-0 hover:bg-surface-2/80"
      onClick={() => navigate(clientProfilePath(row.clientCode))}
    >
      <td className="py-4 pr-4 pl-5 align-top">
        <Link
          to={clientProfilePath(row.clientCode)}
          className="block hover:underline underline-offset-2"
          onClick={(e) => e.stopPropagation()}
        >
          <span className="text-[16px] font-semibold text-ink">{row.clientCode}</span>
          {showDisplayName && (
            <span className="mt-0.5 block text-[14px] text-muted">{row.clientDisplayName}</span>
          )}
        </Link>
      </td>
      <td className="py-4 pr-4 align-top text-[15px]">
        {row.bcbaName ? <StaffLink name={row.bcbaName} code={row.bcbaCode} /> : "—"}
      </td>
      <td className="py-4 pr-4 align-top text-[15px]">
        {row.supervisorName ? <StaffLink name={row.supervisorName} code={row.supervisorCode} /> : "—"}
      </td>
      <td className="py-4 pr-5 align-top text-[15px]">
        {row.btUnassigned ? (
          <UnassignedChip />
        ) : row.btName ? (
          <StaffLink name={row.btName} code={row.btCode} />
        ) : (
          "—"
        )}
      </td>
    </tr>
  )
}

function ClientMobileCard({ row }: { row: RosterRow }) {
  const showDisplayName =
    row.clientDisplayName.toLowerCase() !== row.clientCode.toLowerCase()

  return (
    <Link
      to={clientProfilePath(row.clientCode)}
      className="block rounded-[var(--radius)] border border-line bg-surface p-4 shadow-card transition-colors hover:bg-surface-2"
    >
      <div>
        <span className="text-[16px] font-semibold text-ink">{row.clientCode}</span>
        {showDisplayName && (
          <p className="mt-0.5 text-[14px] text-muted">{row.clientDisplayName}</p>
        )}
      </div>
      <dl className="mt-3 grid grid-cols-[7rem_1fr] gap-x-3 gap-y-2 text-[15px]">
        <dt className="text-muted">BCBA</dt>
        <dd className="text-ink">{row.bcbaName ?? "—"}</dd>
        <dt className="text-muted">Clinical supervisor</dt>
        <dd className="text-ink">{row.supervisorName ?? "—"}</dd>
        <dt className="text-muted">Technician</dt>
        <dd>
          {row.btUnassigned ? <UnassignedChip /> : (row.btName ?? "—")}
        </dd>
      </dl>
    </Link>
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
  const [bcbaFilter, setBcbaFilter] = useState<BcbaFilter>("all")
  const [sortKey, setSortKey] = useState<SortKey>("client")
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc")

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"))
    } else {
      setSortKey(key)
      setSortDir("asc")
    }
  }

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

  const filteredRows = useMemo(() => {
    if (bcbaFilter === "all") return allRows
    return allRows.filter((r) => r.bcbaId === bcbaFilter)
  }, [allRows, bcbaFilter])

  const sortedRows = useMemo(() => {
    const rows = [...filteredRows]
    rows.sort((a, b) => compareRosterRows(a, b, sortKey, sortDir))
    return rows
  }, [filteredRows, sortKey, sortDir])

  const footerStats = useMemo(() => {
    const btIds = new Set(filteredRows.filter((r) => r.btId).map((r) => r.btId as string))
    const unassigned = filteredRows.filter((r) => r.btUnassigned).length
    return {
      clientCount: filteredRows.length,
      btCount: btIds.size,
      unassignedBtCount: unassigned,
    }
  }, [filteredRows])

  const hasRoster = allRows.length > 0
  const filterEmpty = hasRoster && filteredRows.length === 0

  return (
    <OwnerAppShell ownerName={ownerName} practiceName={practiceName}>
      <div className="flex min-h-0 flex-1 flex-col">
        <header className="mb-6 shrink-0 short:mb-4">
          <h1 className="text-[clamp(1.75rem,3vw,2.25rem)] font-semibold tracking-[-0.02em] text-ink">
            Clients
          </h1>
          <p className="mt-1.5 text-[16px] text-muted">
            {hasRoster
              ? `${allRows.length} active clients across Jennifer, Blair, and Annie’s caseloads`
              : "Client care teams — BCBA, clinical supervisor, and technician assignments"}
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
            <div className="space-y-5">
              {bcbaSummaries.length > 0 && (
                <div className="grid gap-3 sm:grid-cols-3">
                  {bcbaSummaries.map((summary) => (
                    <BcbaOverviewCard
                      key={summary.staffId}
                      summary={summary}
                      active={bcbaFilter === summary.staffId}
                      onSelect={() => setBcbaFilter(summary.staffId)}
                    />
                  ))}
                </div>
              )}

              <div
                className="flex w-fit flex-wrap gap-1 rounded-full border border-line bg-surface-2 p-0.5"
                role="tablist"
                aria-label="Filter by BCBA"
              >
                <button
                  type="button"
                  role="tab"
                  aria-selected={bcbaFilter === "all"}
                  onClick={() => setBcbaFilter("all")}
                  className={cn(
                    "rounded-full px-3.5 py-1.5 text-[14px] font-medium transition-colors",
                    bcbaFilter === "all"
                      ? "bg-surface text-brand shadow-card"
                      : "text-muted hover:text-ink",
                  )}
                >
                  All ({allRows.length})
                </button>
                {bcbaSummaries.map((summary) => (
                  <button
                    key={summary.staffId}
                    type="button"
                    role="tab"
                    aria-selected={bcbaFilter === summary.staffId}
                    onClick={() => setBcbaFilter(summary.staffId)}
                    className={cn(
                      "rounded-full px-3.5 py-1.5 text-[14px] font-medium transition-colors",
                      bcbaFilter === summary.staffId
                        ? "bg-surface text-brand shadow-card"
                        : "text-muted hover:text-ink",
                    )}
                  >
                    {summary.fullName} ({summary.clientCount})
                  </button>
                ))}
              </div>

              {filterEmpty ? (
                <div className="rounded-[var(--radius)] bg-surface p-10 text-center shadow-card">
                  <p className="text-[15px] text-muted">No clients on this caseload</p>
                </div>
              ) : (
                <>
                  <div className="hidden overflow-hidden rounded-[var(--radius)] border border-line bg-surface shadow-card sm:block">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="border-b border-line-soft">
                          <SortableHeader
                            label="Client"
                            sortKey="client"
                            activeKey={sortKey}
                            sortDir={sortDir}
                            onSort={handleSort}
                            className="pl-5"
                          />
                          <SortableHeader
                            label="BCBA"
                            sortKey="bcba"
                            activeKey={sortKey}
                            sortDir={sortDir}
                            onSort={handleSort}
                          />
                          <SortableHeader
                            label="Clinical supervisor"
                            sortKey="supervisor"
                            activeKey={sortKey}
                            sortDir={sortDir}
                            onSort={handleSort}
                          />
                          <SortableHeader
                            label="Technician"
                            sortKey="bt"
                            activeKey={sortKey}
                            sortDir={sortDir}
                            onSort={handleSort}
                            className="pr-5"
                          />
                        </tr>
                      </thead>
                      <tbody>
                        {sortedRows.map((row) => (
                          <ClientTableRow key={row.clientId} row={row} />
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="space-y-3 sm:hidden">
                    {sortedRows.map((row) => (
                      <ClientMobileCard key={row.clientId} row={row} />
                    ))}
                  </div>

                  <p className="text-[15px] text-muted">
                    Showing {footerStats.clientCount} client
                    {footerStats.clientCount === 1 ? "" : "s"}
                    {" · "}
                    {footerStats.btCount} technician{footerStats.btCount === 1 ? "" : "s"}
                    {footerStats.unassignedBtCount > 0 && (
                      <>
                        {" · "}
                        <span className="text-alert">
                          {footerStats.unassignedBtCount} unassigned
                        </span>
                      </>
                    )}
                  </p>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </OwnerAppShell>
  )
}
