/**
 * BFM UX lessons (Built for Mars — Block 7 design pass; MCP unavailable):
 * 1. Urgency needs icon + color + label — never color alone (Unassigned BT chip uses AlertCircle + amber + text).
 * 2. Empty states teach the next action — neutral “import roster” vs filter-empty “no clients on this caseload”.
 * 3. Progressive disclosure — multi-BCBA org view lives here, not on the owner dashboard (3 cards only).
 */
import { useEffect, useMemo, useState } from "react"
import { AlertCircle, ArrowLeft, CheckCircle2 } from "lucide-react"
import { Link, useNavigate } from "react-router-dom"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  getBcbaSummaries,
  getRosterRows,
  type BcbaSummary,
  type RosterRow,
} from "@/lib/rosterTable"
import { toSlug } from "@/lib/slug"

type BcbaFilter = "all" | string

function UnassignedChip() {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-800 ring-1 ring-amber-200">
      <AlertCircle className="size-3.5 shrink-0" aria-hidden="true" />
      Unassigned
    </span>
  )
}

function StaffLink({ name }: { name: string }) {
  return (
    <Link
      to={`/staff/${toSlug(name)}`}
      className="hover:underline underline-offset-2"
      onClick={(e) => e.stopPropagation()}
    >
      {name}
    </Link>
  )
}

function RosterTableRow({ row }: { row: RosterRow }) {
  const navigate = useNavigate()
  const showDisplayName =
    row.clientDisplayName.toLowerCase() !== row.clientCode.toLowerCase()

  return (
    <tr
      className="border-b border-border last:border-0 hover:bg-muted/40 cursor-pointer"
      onClick={() => navigate(`/clients/${row.clientId}`)}
    >
      <td className="py-3 pr-4 pl-4 align-top">
        <Link
          to={`/clients/${row.clientId}`}
          className="block hover:underline underline-offset-2"
          onClick={(e) => e.stopPropagation()}
        >
          <span className="font-semibold text-sm">{row.clientCode}</span>
          {showDisplayName && (
            <span className="block text-xs text-muted-foreground mt-0.5">
              {row.clientDisplayName}
            </span>
          )}
        </Link>
      </td>
      <td className="py-3 pr-4 align-top text-sm">
        {row.bcbaName ? <StaffLink name={row.bcbaName} /> : "—"}
      </td>
      <td className="py-3 pr-4 align-top text-sm">
        {row.supervisorName ? <StaffLink name={row.supervisorName} /> : "—"}
      </td>
      <td className="py-3 align-top text-sm">
        {row.btUnassigned ? (
          <UnassignedChip />
        ) : row.btName ? (
          <StaffLink name={row.btName} />
        ) : (
          "—"
        )}
      </td>
    </tr>
  )
}

function RosterMobileCard({ row }: { row: RosterRow }) {
  const showDisplayName =
    row.clientDisplayName.toLowerCase() !== row.clientCode.toLowerCase()

  return (
    <Link
      to={`/clients/${row.clientId}`}
      className="block rounded-lg border border-border bg-white p-4 space-y-2 hover:bg-muted/30 transition-colors"
    >
      <div>
        <span className="font-semibold">{row.clientCode}</span>
        {showDisplayName && (
          <p className="text-xs text-muted-foreground mt-0.5">{row.clientDisplayName}</p>
        )}
      </div>
      <dl className="grid grid-cols-[6.5rem_1fr] gap-x-3 gap-y-1.5 text-sm">
        <dt className="text-muted-foreground">BCBA</dt>
        <dd>{row.bcbaName ?? "—"}</dd>
        <dt className="text-muted-foreground">Supervisor</dt>
        <dd>{row.supervisorName ?? "—"}</dd>
        <dt className="text-muted-foreground">BT</dt>
        <dd>
          {row.btUnassigned ? <UnassignedChip /> : (row.btName ?? "—")}
        </dd>
      </dl>
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
      className={`rounded-lg border p-4 text-left transition-colors w-full ${
        active
          ? "border-[#0D7377] bg-[#E8F7F7] ring-1 ring-[#0D7377]/30"
          : "border-border bg-white hover:border-[#0D7377]/40"
      }`}
    >
      <p className="font-semibold text-sm text-[#0D7377]">{summary.fullName}</p>
      <p className="mt-1 text-xs text-muted-foreground">
        {summary.clientCount} client{summary.clientCount === 1 ? "" : "s"}
        {" · "}
        {summary.btCount} BT{summary.btCount === 1 ? "" : "s"}
        {summary.unassignedBtCount > 0 && (
          <>
            {" · "}
            <span className="text-amber-700 font-medium">
              {summary.unassignedBtCount} unassigned
            </span>
          </>
        )}
      </p>
    </button>
  )
}

export function RosterPage({ practiceId }: { practiceId: string }) {
  const [allRows, setAllRows] = useState<RosterRow[]>([])
  const [bcbaSummaries, setBcbaSummaries] = useState<BcbaSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [bcbaFilter, setBcbaFilter] = useState<BcbaFilter>("all")

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(false)

    Promise.all([
      getRosterRows(practiceId),
      getBcbaSummaries(practiceId),
    ])
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

  const footerStats = useMemo(() => {
    const btIds = new Set(
      filteredRows.filter((r) => r.btId).map((r) => r.btId as string),
    )
    const unassigned = filteredRows.filter((r) => r.btUnassigned).length
    return {
      clientCount: filteredRows.length,
      btCount: btIds.size,
      unassignedBtCount: unassigned,
    }
  }, [filteredRows])

  const hasRoster = allRows.length > 0
  const filterEmpty = hasRoster && filteredRows.length === 0
  const allBtsAssigned =
    hasRoster && filteredRows.length > 0 && footerStats.unassignedBtCount === 0

  return (
    <div className="min-h-svh bg-[#F0F4F4] text-foreground flex flex-col items-center gap-6 p-4 pb-10">
      <header className="flex w-full max-w-5xl items-center justify-between gap-4 pt-2">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="size-4" />
          Dashboard
        </Link>
      </header>

      <div className="w-full max-w-5xl space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-[#1E2A2A]">
            Caseload roster
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Client care teams — BCBA, supervisor, and BT assignments
          </p>
        </div>

        {loading && (
          <p className="text-sm text-muted-foreground animate-pulse py-12 text-center">
            Loading roster…
          </p>
        )}

        {error && (
          <Card>
            <CardContent className="py-10 text-center text-sm text-red-600">
              Could not load roster. Please refresh and try again.
            </CardContent>
          </Card>
        )}

        {!loading && !error && !hasRoster && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">No roster imported yet</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground space-y-2">
              <p>
                Import your caseload from{" "}
                <code className="text-xs bg-muted px-1.5 py-0.5 rounded">
                  templates/roster_import.csv
                </code>
                .
              </p>
              <p>
                See{" "}
                <code className="text-xs bg-muted px-1.5 py-0.5 rounded">
                  templates/README.md
                </code>{" "}
                for column definitions and the CLI import command.
              </p>
            </CardContent>
          </Card>
        )}

        {!loading && !error && hasRoster && (
          <>
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
              className="flex flex-wrap gap-1 rounded-full border border-[#D0DCDC] bg-[#E8F7F7] p-0.5 w-fit"
              role="tablist"
              aria-label="Filter by BCBA"
            >
              <button
                type="button"
                role="tab"
                aria-selected={bcbaFilter === "all"}
                onClick={() => setBcbaFilter("all")}
                className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                  bcbaFilter === "all"
                    ? "bg-white text-[#0D7377] shadow-sm"
                    : "text-[#4A5C5C] hover:text-[#0D7377]"
                }`}
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
                  className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                    bcbaFilter === summary.staffId
                      ? "bg-white text-[#0D7377] shadow-sm"
                      : "text-[#4A5C5C] hover:text-[#0D7377]"
                  }`}
                >
                  {summary.fullName} ({summary.clientCount})
                </button>
              ))}
            </div>

            {filterEmpty ? (
              <Card>
                <CardContent className="py-10 text-center text-sm text-muted-foreground">
                  No clients on this caseload
                </CardContent>
              </Card>
            ) : (
              <>
                <div className="hidden sm:block rounded-lg border border-border bg-white overflow-hidden">
                  <table className="w-full text-left px-4">
                    <thead>
                      <tr className="border-b border-border text-xs text-muted-foreground">
                        <th className="py-3 pr-4 pl-4 font-medium">Client</th>
                        <th className="py-3 pr-4 font-medium">BCBA</th>
                        <th className="py-3 pr-4 font-medium">Clinical Supervisor</th>
                        <th className="py-3 pr-4 font-medium">BT</th>
                      </tr>
                    </thead>
                    <tbody className="px-4">
                      {filteredRows.map((row) => (
                        <RosterTableRow key={row.clientId} row={row} />
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="sm:hidden space-y-3">
                  {filteredRows.map((row) => (
                    <RosterMobileCard key={row.clientId} row={row} />
                  ))}
                </div>
              </>
            )}

            {!filterEmpty && (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  Showing {footerStats.clientCount} client
                  {footerStats.clientCount === 1 ? "" : "s"}
                  {" · "}
                  {footerStats.btCount} BT{footerStats.btCount === 1 ? "" : "s"}
                  {footerStats.unassignedBtCount > 0 && (
                    <>
                      {" · "}
                      <span className="text-amber-700">
                        {footerStats.unassignedBtCount} unassigned BT
                        {footerStats.unassignedBtCount === 1 ? "" : "s"}
                      </span>
                    </>
                  )}
                </p>
                {allBtsAssigned && (
                  <p className="inline-flex items-center gap-1.5 text-xs text-emerald-700">
                    <CheckCircle2 className="size-3.5" aria-hidden="true" />
                    All BT slots filled
                  </p>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
