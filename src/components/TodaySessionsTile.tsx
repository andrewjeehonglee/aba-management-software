import { useState, useEffect } from "react"
import { Link } from "react-router-dom"
import { CalendarOff } from "lucide-react"
import { SessionStatusBadge } from "@/components/SessionStatusBadge"
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { getSessionsToday, type SessionRecord } from "@/lib/supabase"
import { STATUS_ORDER, formatTime } from "@/lib/sessions"
import { cn } from "@/lib/utils"
import type { SessionStatus } from "@/types/session"
import type { TeamFilter } from "@/types/team"

type StatusFilter = SessionStatus | "all"

const SORT_OPTIONS = {
  time: {
    label: "Time (earliest → latest)",
    compare: (a: SessionRecord, b: SessionRecord) => a.time.localeCompare(b.time),
  },
  status: {
    label: "Status",
    compare: (a: SessionRecord, b: SessionRecord) =>
      STATUS_ORDER[a.status as SessionStatus] - STATUS_ORDER[b.status as SessionStatus] ||
      a.time.localeCompare(b.time),
  },
  staff: {
    label: "Staff (A → Z)",
    compare: (a: SessionRecord, b: SessionRecord) =>
      a.staffName.localeCompare(b.staffName) ||
      a.time.localeCompare(b.time),
  },
  client: {
    label: "Client (A → Z)",
    compare: (a: SessionRecord, b: SessionRecord) =>
      a.clientName.localeCompare(b.clientName) ||
      a.time.localeCompare(b.time),
  },
} as const

type SortKey = keyof typeof SORT_OPTIONS

const FILTER_CHIPS: { value: StatusFilter; label: string }[] = [
  { value: "all",         label: "All" },
  { value: "completed",   label: "Completed" },
  { value: "in-progress", label: "In progress" },
  { value: "scheduled",   label: "Scheduled" },
  { value: "cancelled",   label: "Cancelled" },
  { value: "no-show",     label: "No-show" },
]

export function TodaySessionsTile({ className, teamFilter, staffId, isDemo }: { className?: string; teamFilter?: TeamFilter; staffId?: string; isDemo?: boolean }) {
  const [sortKey, setSortKey] = useState<SortKey>("time")
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all")
  const [allSessions, setAllSessions] = useState<SessionRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    setError(null)
    getSessionsToday(staffId, isDemo)
      .then(setAllSessions)
      .catch((err) => setError(err.message ?? "Failed to load sessions"))
      .finally(() => setLoading(false))
  }, [staffId, isDemo])

  const teamSessions = teamFilter && teamFilter !== "All"
    ? allSessions.filter(s => s.staffTeam === teamFilter)
    : allSessions

  const filteredSessions =
    statusFilter === "all"
      ? teamSessions
      : teamSessions.filter((s) => s.status === statusFilter)

  const sortedSessions: SessionRecord[] = [...filteredSessions].sort(
    SORT_OPTIONS[sortKey].compare
  )

  return (
    <Card size="sm" className={cn("w-full", className)}>
      <CardHeader>
        <CardTitle>Today's Sessions</CardTitle>
        <CardAction>
          <Select
            value={sortKey}
            onValueChange={(v) => setSortKey(v as SortKey)}
          >
            <SelectTrigger className="h-8 w-[180px] text-xs">
              <SelectValue>{SORT_OPTIONS[sortKey].label}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {Object.entries(SORT_OPTIONS).map(([key, { label }]) => (
                <SelectItem key={key} value={key} className="text-xs">
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardAction>
      </CardHeader>
      <CardContent>
        {/* Filter chip row */}
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <span className="text-xs text-muted-foreground shrink-0">
            Filter:
          </span>
          <ToggleGroup
            value={[statusFilter]}
            onValueChange={(values) => {
              if (values.length > 0) {
                setStatusFilter(values[0] as StatusFilter)
              }
            }}
            variant="outline"
            size="sm"
            spacing={1}
          >
            {FILTER_CHIPS.map((chip) => (
              <ToggleGroupItem
                key={chip.value}
                value={chip.value}
                className="rounded-full text-xs"
              >
                {chip.label}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </div>

        {loading && (
          <p className="py-8 text-center text-sm text-muted-foreground">Loading…</p>
        )}
        {error && (
          <p className="py-8 text-center text-sm text-destructive">{error}</p>
        )}
        {!loading && !error && sortedSessions.length === 0 && (
          <div className="flex flex-col items-center gap-3 rounded-md border border-dashed border-border py-10 text-center">
            <CalendarOff className="w-8 h-8 text-[#14A0A5]" />
            <div className="space-y-1">
              <p className="text-sm font-medium text-[#1E2A2A]">No sessions today</p>
              <p className="text-xs text-muted-foreground">Sessions will appear here once your team starts logging their work.</p>
            </div>
          </div>
        )}
        {!loading && !error && sortedSessions.length > 0 && (
          <div className="flex flex-col gap-1.5">
            {sortedSessions.map((s) => {
              const leftBorder =
                s.status === "completed"   ? "border-l-emerald-500" :
                s.status === "in-progress" ? "border-l-blue-500"    :
                s.status === "scheduled"   ? "border-l-amber-400"   :
                "border-l-red-400"

              return (
                <div
                  key={s.id}
                  className={`flex items-center gap-3 rounded-lg border border-border/60 border-l-4 ${leftBorder} bg-card px-3 py-2.5 shadow-sm transition-shadow hover:shadow-md`}
                >
                  <div className="w-10 shrink-0 font-mono text-xs tabular-nums text-muted-foreground">
                    {formatTime(s.time)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <Link
                      to={"/clients/" + s.clientId}
                      className="block truncate text-sm font-medium text-[#1E2A2A] hover:text-[#0D7377] hover:underline underline-offset-2"
                    >
                      {s.clientName}
                    </Link>
                    <div className="truncate text-xs text-muted-foreground">{s.staffName}</div>
                  </div>
                  <div className="hidden max-w-[6rem] shrink-0 truncate text-right text-xs text-muted-foreground sm:block">
                    {s.sessionType}
                  </div>
                  <div className="shrink-0">
                    <SessionStatusBadge status={s.status as SessionStatus} />
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
