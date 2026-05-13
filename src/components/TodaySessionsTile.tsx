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
import { mockSessions } from "@/data/mockSessions"
import { cn } from "@/lib/utils"
import type { Session, SessionStatus } from "@/types/session"

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

  const sortedSessions: Session[] = [...mockSessions].sort(
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
        <ul className="space-y-2">
          {sortedSessions.map((s) => (
            <li
              key={s.id}
              className="flex items-center gap-2 text-sm"
            >
              <span className="font-mono text-xs text-muted-foreground tabular-nums w-12 shrink-0">
                {formatTime(s.time)}
              </span>
              <span className="flex-1 truncate min-w-0">
                {s.clientName}{" "}
                <span className="text-muted-foreground">· {s.staffName}</span>
              </span>
              <StatusBadge status={s.status} />
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  )
}
