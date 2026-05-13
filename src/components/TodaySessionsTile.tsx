import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { mockSessions } from "@/data/mockSessions"
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

export function TodaySessionsTile() {
  const sortedSessions: Session[] = [...mockSessions].sort((a, b) =>
    a.time.localeCompare(b.time)
  )

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle>Today's Sessions</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-[44px_1fr_1fr_1fr_auto] gap-x-3 gap-y-1 text-xs">
          {/* Header row */}
          <div className="text-muted-foreground pb-2 border-b">Time</div>
          <div className="text-muted-foreground pb-2 border-b">Client</div>
          <div className="text-muted-foreground pb-2 border-b">Staff</div>
          <div className="text-muted-foreground pb-2 border-b">Type</div>
          <div className="text-muted-foreground pb-2 border-b text-right">
            Status
          </div>

          {/* Session rows */}
          {sortedSessions.map((s) => (
            <div key={s.id} className="contents">
              <div className="font-mono text-muted-foreground py-1.5">
                {formatTime(s.time)}
              </div>
              <div className="truncate min-w-0 py-1.5">{s.clientName}</div>
              <div className="truncate min-w-0 py-1.5">{s.staffName}</div>
              <div className="truncate min-w-0 py-1.5 text-muted-foreground">
                {s.sessionType}
              </div>
              <div className="flex items-center justify-end py-1.5">
                <StatusBadge status={s.status} />
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
