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

export function TodaySessionsTile({ className, teamFilter, staffId }: { className?: string; teamFilter?: TeamFilter; staffId?: string }) {
  const [sortKey, setSortKey] = useState<SortKey>("time")
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all")
  const [allSessions, setAllSessions] = useState<SessionRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    setError(null)
    getSessionsToday(staffId)
      .then(setAllSessions)
      .catch((err) => setError(err.message ?? "Failed to load sessions"))
      .finally(() => setLoading(false))
  }, [staffId])

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
          <div className="rounded-md border border-dashed border-border py-8 text-center text-sm text-muted-foreground flex flex-col items-center gap-2">
            <CalendarOff className="w-8 h-8 text-[#14A0A5]" />
            No sessions match this filter.
          </div>
        )}
        {!loading && !error && sortedSessions.length > 0 && (
          <div className="flex flex-col text-xs">
            <div className="grid grid-cols-[3.5rem_minmax(0,1fr)_minmax(0,1fr)_8rem_6rem] gap-x-3 border-b pb-2 text-muted-foreground">
              <div>Time</div>
              <div>Client</div>
              <div>Staff</div>
              <div>Type</div>
              <div className="text-right">Status</div>
            </div>

            {sortedSessions.map((s) => (
              <Link
                key={s.id}
                to={"/clients/" + s.clientId}
                className="grid grid-cols-[3.5rem_minmax(0,1fr)_minmax(0,1fr)_8rem_6rem] gap-x-3 -mx-2 px-2 rounded items-center transition-colors hover:bg-muted/60 cursor-pointer"
              >
                <div className="font-mono text-muted-foreground tabular-nums py-1.5">
                  {formatTime(s.time)}
                </div>
                <div className="truncate min-w-0 py-1.5 text-sm font-medium">
                  {s.clientName}
                </div>
                <div className="truncate min-w-0 py-1.5 text-sm text-muted-foreground">
                  {s.staffName}
                </div>
                <div className="truncate min-w-0 py-1.5 text-muted-foreground">
                  {s.sessionType}
                </div>
                <div className="flex items-center justify-end py-1.5">
                  <SessionStatusBadge status={s.status as SessionStatus} />
                </div>
              </Link>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
