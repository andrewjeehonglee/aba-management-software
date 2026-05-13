import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { mockSessions } from "@/data/mockSessions"
import { cn } from "@/lib/utils"
import type { Session, SessionStatus } from "@/types/session"

const PREVIEW_ROW_LIMIT = 5

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
  const sortedSessions: Session[] = [...mockSessions].sort((a, b) =>
    a.time.localeCompare(b.time)
  )
  const previewSessions = sortedSessions.slice(0, PREVIEW_ROW_LIMIT)

  return (
    <Card size="sm" className={cn("w-full", className)}>
      <CardHeader>
        <CardTitle>Today's Sessions</CardTitle>
        <CardAction>
          <button
            type="button"
            className="text-xs font-medium text-primary hover:underline"
          >
            View all →
          </button>
        </CardAction>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2">
          {previewSessions.map((s) => (
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
