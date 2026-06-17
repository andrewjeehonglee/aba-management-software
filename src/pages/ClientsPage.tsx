import { useEffect, useMemo, useState } from "react"
import { AlertCircle, Search, X } from "lucide-react"
import { Link } from "react-router-dom"
import { OwnerAppShell } from "@/components/dashboard/OwnerAppShell"
import { OwnerRoleTabs } from "@/components/dashboard/OwnerRoleTabs"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useOwnerShell } from "@/hooks/useOwnerShell"
import { getBcbaSummaries, getRosterRows, type BcbaSummary, type RosterRow } from "@/lib/rosterTable"
import { clientProfilePath, getRosterStaffByRole, staffProfilePath, type RosterStaffEntry } from "@/lib/rosterScope"
import { cn } from "@/lib/utils"

type ViewRole = "Owner" | "BCBA" | "Supervisor" | "Technician"
type GroupMode = "bcba" | "az"

const PREVIEW_DEFAULTS: Record<Exclude<ViewRole, "Owner">, string> = {
  BCBA: "Jennifer",
  Supervisor: "Hilary",
  Technician: "Jazmine",
}

const TEAM_GRID =
  "grid w-full max-w-[38rem] grid-cols-[minmax(4.5rem,5.25rem)_minmax(6.5rem,8.5rem)_minmax(6.5rem,8.5rem)] items-center gap-x-3 sm:max-w-[42rem] sm:grid-cols-[5.5rem_9rem_9rem] sm:gap-x-4"

function normaliseRole(raw?: string): string {
  return (raw ?? "technician").toLowerCase()
}

function rowMatchesSearch(row: RosterRow, query: string): boolean {
  const q = query.trim().toLowerCase()
  if (!q) return true
  return (
    row.clientCode.toLowerCase().includes(q) ||
    row.clientDisplayName.toLowerCase().includes(q) ||
    (row.supervisorName?.toLowerCase().includes(q) ?? false) ||
    (row.btName?.toLowerCase().includes(q) ?? false)
  )
}

function sortRowsAz(rows: RosterRow[]): RosterRow[] {
  return [...rows].sort((a, b) =>
    a.clientCode.localeCompare(b.clientCode, undefined, { sensitivity: "base" }),
  )
}

function UnassignedChip() {
  return (
    <span className="inline-flex items-center gap-1 text-[15px] text-alert">
      <AlertCircle className="size-3.5 shrink-0" aria-hidden />
      Unassigned
    </span>
  )
}

function StaffName({ name, code }: { name: string; code?: string | null }) {
  if (!code) return <span className="text-[15px] text-ink">{name}</span>
  return (
    <Link
      to={staffProfilePath(code)}
      className="text-[15px] text-ink hover:text-brand hover:underline underline-offset-2"
      onClick={(e) => e.stopPropagation()}
    >
      {name}
    </Link>
  )
}

function TeamColumnHeader() {
  return (
    <div
      className={`${TEAM_GRID} px-3.5 pb-2 text-[12px] font-semibold uppercase tracking-[0.08em] text-muted sm:px-4`}
      aria-hidden
    >
      <span>Client</span>
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
      className={`${TEAM_GRID} rounded-[var(--radius)] bg-surface px-3.5 py-2.5 shadow-card transition-shadow hover:bg-surface-2 sm:px-4`}
    >
      <div className="min-w-0">
        <p className="text-[16px] font-semibold leading-snug text-ink">{row.clientCode}</p>
        {showDisplayName && (
          <p className="mt-0.5 truncate text-[14px] text-muted">{row.clientDisplayName}</p>
        )}
      </div>
      <div className="min-w-0">
        {row.supervisorName ? (
          <StaffName name={row.supervisorName} code={row.supervisorCode} />
        ) : (
          <span className="text-[15px] text-muted">—</span>
        )}
      </div>
      <div className="min-w-0">
        {row.btUnassigned ? (
          <UnassignedChip />
        ) : row.btName ? (
          <StaffName name={row.btName} code={row.btCode} />
        ) : (
          <span className="text-[15px] text-muted">—</span>
        )}
      </div>
    </Link>
  )
}

function ClientsFlatList({ rows }: { rows: RosterRow[] }) {
  if (rows.length === 0) {
    return (
      <p className="py-12 text-center text-[16px] text-muted">No clients match your search.</p>
    )
  }

  return (
    <div className="w-fit max-w-full">
      <TeamColumnHeader />
      <ul className="space-y-2.5">
        {rows.map((row) => (
          <li key={row.clientId}>
            <ClientTeamRow row={row} />
          </li>
        ))}
      </ul>
    </div>
  )
}

function BcbaTeamSection({
  summary,
  clients,
}: {
  summary: BcbaSummary
  clients: RosterRow[]
}) {
  if (clients.length === 0) return null

  const bcbaCode = clients[0]?.bcbaCode

  const unassignedInView = clients.filter((r) => r.btUnassigned).length

  return (
    <section className="w-fit max-w-full">
      <div className="mb-3 flex flex-wrap items-baseline gap-x-2 gap-y-1">
        {bcbaCode ? (
          <Link
            to={staffProfilePath(bcbaCode)}
            className="text-[20px] font-semibold text-ink hover:text-brand hover:underline underline-offset-2"
          >
            {summary.fullName}
          </Link>
        ) : (
          <h2 className="text-[20px] font-semibold text-ink">{summary.fullName}</h2>
        )}
        <span className="text-[13px] font-semibold uppercase tracking-[0.08em] text-muted">
          BCBA
        </span>
        <span className="text-[15px] text-muted">
          ({clients.length} client{clients.length === 1 ? "" : "s"})
        </span>
        {unassignedInView > 0 && (
          <span className="text-[15px] text-alert">
            ({unassignedInView} unassigned technician{unassignedInView === 1 ? "" : "s"})
          </span>
        )}
      </div>
      <TeamColumnHeader />
      <ul className="space-y-2.5">
        {clients.map((row) => (
          <li key={row.clientId}>
            <ClientTeamRow row={row} />
          </li>
        ))}
      </ul>
    </section>
  )
}

function GroupingToggle({
  mode,
  onModeChange,
}: {
  mode: GroupMode
  onModeChange: (mode: GroupMode) => void
}) {
  return (
    <div
      className="inline-flex shrink-0 items-center gap-0.5 rounded-full border border-line bg-surface-2 p-1 shadow-card"
      role="tablist"
      aria-label="Client list grouping"
    >
      {(
        [
          { value: "bcba" as const, label: "By BCBA" },
          { value: "az" as const, label: "A–Z" },
        ] as const
      ).map(({ value, label }) => {
        const active = mode === value
        return (
          <button
            key={value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onModeChange(value)}
            className={cn(
              "rounded-full px-3 py-1.5 text-[12px] font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand",
              active
                ? "bg-surface text-brand shadow-card"
                : "text-muted hover:text-ink-soft",
            )}
          >
            {label}
          </button>
        )
      })}
    </div>
  )
}

export function ClientsPage({
  practiceId,
  userRole,
  currentStaffId,
  isDemo,
}: {
  practiceId: string
  userRole?: string
  currentStaffId?: string | null
  isDemo?: boolean
}) {
  const { ownerName, practiceName } = useOwnerShell(practiceId, userRole)
  const accountRole = normaliseRole(userRole)
  const isAccountOwner = accountRole === "owner"

  const [viewRole, setViewRole] = useState<ViewRole>(
    isAccountOwner ? "Owner" : (accountRole === "bcba" ? "BCBA" : accountRole === "supervisor" ? "Supervisor" : "Technician"),
  )
  const [previewStaffId, setPreviewStaffId] = useState<string | null>(null)
  const [previewOptions, setPreviewOptions] = useState<RosterStaffEntry[]>([])
  const [groupMode, setGroupMode] = useState<GroupMode>("bcba")
  const [searchQuery, setSearchQuery] = useState("")

  const [allRows, setAllRows] = useState<RosterRow[]>([])
  const [bcbaSummaries, setBcbaSummaries] = useState<BcbaSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  const isDemoOwnerPreview = isDemo && isAccountOwner && viewRole !== "Owner"
  const isOwnerPreview = isDemoOwnerPreview
  const showOwnerGrouping = isAccountOwner && viewRole === "Owner" && !isDemoOwnerPreview

  const effectiveScopeRole = isDemoOwnerPreview
    ? viewRole.toLowerCase()
    : accountRole

  useEffect(() => {
    if (!isOwnerPreview) {
      setPreviewOptions([])
      setPreviewStaffId(null)
      return
    }

    const roleMap: Record<Exclude<ViewRole, "Owner">, "bcba" | "supervisor" | "technician"> = {
      BCBA: "bcba",
      Supervisor: "supervisor",
      Technician: "technician",
    }
    const dbRole = roleMap[viewRole as Exclude<ViewRole, "Owner">]
    const preferredName = PREVIEW_DEFAULTS[viewRole as Exclude<ViewRole, "Owner">]

    getRosterStaffByRole(practiceId, dbRole)
      .then((options) => {
        setPreviewOptions(options)
        const preferred = options.find((s) => s.fullName === preferredName)
        setPreviewStaffId((prev) => {
          if (prev && options.some((s) => s.id === prev)) return prev
          return preferred?.id ?? options[0]?.id ?? null
        })
      })
      .catch(() => {
        setPreviewOptions([])
        setPreviewStaffId(null)
      })
  }, [practiceId, isOwnerPreview, viewRole])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(false)

    const rosterOptions =
      effectiveScopeRole === "bcba" && (previewStaffId || currentStaffId)
        ? { bcbaStaffId: (isDemoOwnerPreview ? previewStaffId : currentStaffId)! }
        : effectiveScopeRole === "supervisor" && (previewStaffId || currentStaffId)
          ? { supervisorStaffId: (isDemoOwnerPreview ? previewStaffId : currentStaffId)! }
          : effectiveScopeRole === "technician" && (previewStaffId || currentStaffId)
            ? { technicianStaffId: (isDemoOwnerPreview ? previewStaffId : currentStaffId)! }
            : undefined

    const needsStaffId =
      effectiveScopeRole === "bcba" ||
      effectiveScopeRole === "supervisor" ||
      effectiveScopeRole === "technician"

    if (needsStaffId && !rosterOptions) {
      setAllRows([])
      setBcbaSummaries([])
      setLoading(false)
      return
    }

    Promise.all([
      getRosterRows(practiceId, rosterOptions),
      showOwnerGrouping ? getBcbaSummaries(practiceId) : Promise.resolve([]),
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
  }, [
    practiceId,
    effectiveScopeRole,
    previewStaffId,
    currentStaffId,
    isDemoOwnerPreview,
    showOwnerGrouping,
  ])

  const filteredRows = useMemo(() => {
    return allRows.filter((row) => rowMatchesSearch(row, searchQuery))
  }, [allRows, searchQuery])

  const teamsByBcba = useMemo(() => {
    if (!showOwnerGrouping || groupMode !== "bcba") return []

    const sortedSummaries = [...bcbaSummaries].sort((a, b) =>
      a.fullName.localeCompare(b.fullName, undefined, { sensitivity: "base" }),
    )

    return sortedSummaries
      .map((summary) => {
        const clients = sortRowsAz(
          filteredRows.filter((row) => row.bcbaId === summary.staffId),
        )
        return { summary, clients }
      })
      .filter((team) => team.clients.length > 0)
  }, [showOwnerGrouping, groupMode, filteredRows, bcbaSummaries])

  const flatRows = useMemo(() => sortRowsAz(filteredRows), [filteredRows])

  const unassignedCount = allRows.filter((r) => r.btUnassigned).length
  const hasRoster = allRows.length > 0
  const hasSearch = searchQuery.trim().length > 0

  const subtitle = showOwnerGrouping
    ? unassignedCount > 0
      ? `${allRows.length} active · ${unassignedCount} awaiting technician assignment`
      : `${allRows.length} active client${allRows.length === 1 ? "" : "s"}`
    : `${allRows.length} client${allRows.length === 1 ? "" : "s"}`

  const selectedPreviewStaff = previewOptions.find((s) => s.id === previewStaffId)
  const previewPlaceholder =
    viewRole === "Technician"
      ? "Select Technician"
      : viewRole === "Supervisor"
        ? "Select Supervisor"
        : "Select BCBA"
  const shellPersonaName =
    isOwnerPreview && selectedPreviewStaff?.fullName
      ? selectedPreviewStaff.fullName
      : ownerName

  return (
    <OwnerAppShell
      ownerName={shellPersonaName}
      practiceName={practiceName}
      maxWidthClass="max-w-[min(100%,1680px)]"
    >
      <div className="flex min-h-0 flex-1 flex-col">
        <header className="mb-5 shrink-0 short:mb-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <h1 className="text-[clamp(1.75rem,3vw,2.25rem)] font-semibold tracking-[-0.02em] text-ink">
                Clients
              </h1>
              <p className="mt-1.5 text-[17px] text-muted">
                {hasRoster ? subtitle : "Active client care teams"}
              </p>
            </div>
            <div className="flex flex-col items-end gap-1.5">
              {isDemo && isAccountOwner ? (
                <OwnerRoleTabs viewRole={viewRole} onViewRoleChange={setViewRole} />
              ) : !isAccountOwner ? (
                <span className="inline-flex shrink-0 items-center rounded-full border border-line bg-surface-2 px-3 py-1.5 text-[12px] font-semibold text-muted shadow-card">
                  {accountRole === "bcba"
                    ? "BCBA"
                    : accountRole === "supervisor"
                      ? "Supervisor"
                      : "Technician"}
                </span>
              ) : null}
              {isOwnerPreview && previewOptions.length > 0 && (
                <Select
                  value={previewStaffId ?? undefined}
                  onValueChange={(v) => setPreviewStaffId(v ?? null)}
                >
                  <SelectTrigger className="h-8 w-[180px] text-xs">
                    <SelectValue placeholder={previewPlaceholder}>
                      {selectedPreviewStaff?.fullName ?? previewPlaceholder}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {previewOptions.map((member) => (
                      <SelectItem key={member.id} value={member.id}>
                        {member.fullName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>

          <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative min-w-0 flex-1 sm:max-w-md">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted"
                aria-hidden
              />
              <Input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search clients by name…"
                className="h-11 pl-9 pr-9 text-[16px] shadow-card"
                aria-label="Search clients"
              />
              {hasSearch && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-muted transition-colors hover:bg-surface-2 hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
                  aria-label="Clear search"
                >
                  <X className="size-4" />
                </button>
              )}
            </div>
            {showOwnerGrouping && (
              <GroupingToggle mode={groupMode} onModeChange={setGroupMode} />
            )}
          </div>
        </header>

        <div className="owner-scroll min-h-0 flex-1 overflow-y-auto pr-1">
          {loading && (
            <p className="py-16 text-center text-[16px] text-muted animate-pulse">
              Loading clients…
            </p>
          )}

          {error && (
            <div className="rounded-[var(--radius)] bg-surface p-8 text-center shadow-card">
              <p className="text-[16px] text-alert">
                Could not load clients. Please refresh and try again.
              </p>
            </div>
          )}

          {!loading && !error && !hasRoster && (
            <div className="rounded-[var(--radius)] bg-surface p-8 shadow-card">
              <h2 className="text-[18px] font-semibold text-ink">No roster imported yet</h2>
              <p className="mt-2 text-[16px] text-muted">
                Import your caseload from{" "}
                <code className="rounded bg-surface-2 px-1.5 py-0.5 text-[14px]">
                  templates/roster_import.csv
                </code>
                .
              </p>
            </div>
          )}

          {!loading && !error && hasRoster && (
            <>
              {showOwnerGrouping && groupMode === "bcba" ? (
                <div className="space-y-9">
                  {teamsByBcba.length === 0 ? (
                    <p className="py-12 text-center text-[16px] text-muted">
                      No clients match your search.
                    </p>
                  ) : (
                    teamsByBcba.map(({ summary, clients }) => (
                      <BcbaTeamSection key={summary.staffId} summary={summary} clients={clients} />
                    ))
                  )}
                </div>
              ) : (
                <ClientsFlatList rows={flatRows} />
              )}
            </>
          )}
        </div>
      </div>
    </OwnerAppShell>
  )
}
