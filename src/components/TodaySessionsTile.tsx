import { useState } from "react"
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
import { mockSessions } from "@/data/mockSessions"
import { cn } from "@/lib/utils"
import type { Session, SessionStatus } from "@/types/session"

type StatusFilter = SessionStatus | "all"

const STATUS_CONFIG: Record<
  SessionStatus,
  { label: string; className: string }
> = {
  completed:     { label: "Completed",    className: "bg-emerald-100 text-emerald-800" },
  "in-progress": { label: "In progress",  className: "bg-blue-100 text-blue-800" },
  scheduled:     { label: "Scheduled",    className: "bg-slate-100 text-slate-700" },
  cancelled:     { label: "Cancelled",    className: "bg-amber-100 text-amber-800" },
  "no-show":     { label: "No-show",      className: "bg-red-100 text-red-800" },
}

// Custom status weight — "what should I look at first?"
// In progress comes top because it's happening NOW; cancelled / no-show next
// because they need a note or follow-up; scheduled is future; completed is done.
const STATUS_ORDER: Record<SessionStatus, number> = {
  "in-progress": 0,
  "no-show": 1,
  cancelled: 2,
  scheduled: 3,
  completed: 4,
}

const SORT_OPTIONS = {
  time: {
    label: "Time (earliest → latest)",
    compare: (a: Session, b: Session) => a.time.localeCompare(b.time),
  },
  status: {
    label: "Status",
    compare: (a: Session, b: Session) =>
      STATUS_ORDER[a.status] - STATUS_ORDER[b.status] ||
      a.time.localeCompare(b.time),
  },
  staff: {
    label: "Staff (A → Z)",
    compare: (a: Session, b: Session) =>
      a.staffName.localeCompare(b.staffName) ||
      a.time.localeCompare(b.time),
  },
  client: {
    label: "Client (A → Z)",
    compare: (a: Session, b: Session) =>
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

function StatusBadge({ status }: { status: SessionStatus }) {
  const { label, className } = STATUS_CONFIG[status]
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${className}`}
    >
      {label}
    </span>
  )
}

function formatTime(isoTime: string) {
  return isoTime.slice(11, 16)
}

export function TodaySessionsTile({ className }: { className?: string }) {
  const [sortKey, setSortKey] = useState<SortKey>("time")
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all")

  // Filter FIRST, then sort. Order matters: sorting a smaller filtered list
  // is cheaper, and the resulting UX is "I scoped the data, now order what
  // remains" — matches the user's mental model.
  const filteredSessions =
    statusFilter === "all"
      ? mockSessions
      : mockSessions.filter((s) => s.status === statusFilter)

  const sortedSessions: Session[] = [...filteredSessions].sort(
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
        {/* Filter chip row.
            base-ui's ToggleGroup uses `value: Value[]` even for single-select,
            so we wrap/unwrap with [statusFilter] / values[0]. The
            `if (values.length > 0)` guard keeps "All" reachable — clicking
            the currently-selected chip would otherwise empty the array. */}
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

        {sortedSessions.length === 0 ? (
          <div className="py-8 text-center text-sm text-muted-foreground">
            No sessions match this filter.
          </div>
        ) : (
          <div className="grid grid-cols-[3.5rem_minmax(0,1fr)_minmax(0,1fr)_8rem_6rem] items-center gap-x-3 gap-y-1 text-xs">
            {/* Header row */}
            <div className="text-muted-foreground pb-2 border-b">Time</div>
            <div className="text-muted-foreground pb-2 border-b">Client</div>
            <div className="text-muted-foreground pb-2 border-b">Staff</div>
            <div className="text-muted-foreground pb-2 border-b">Type</div>
            <div className="text-muted-foreground pb-2 border-b text-right">
              Status
            </div>

            {/* Session rows — `contents` wrapper makes each row's children
                participate in the parent grid directly, so all rows align to
                the same column tracks. */}
            {sortedSessions.map((s) => (
              <div key={s.id} className="contents">
                <div className="font-mono text-muted-foreground tabular-nums py-1.5">
                  {formatTime(s.time)}
                </div>
                <div className="truncate min-w-0 py-1.5 text-sm">
                  {s.clientName}
                </div>
                <div className="truncate min-w-0 py-1.5 text-sm text-muted-foreground">
                  {s.staffName}
                </div>
                <div className="truncate min-w-0 py-1.5 text-muted-foreground">
                  {s.sessionType}
                </div>
                <div className="flex items-center justify-end py-1.5">
                  <StatusBadge status={s.status} />
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
