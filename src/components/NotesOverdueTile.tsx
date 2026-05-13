import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { mockOverdueNotes } from "@/data/mockOverdueNotes"
import { cn } from "@/lib/utils"

const PREVIEW_ROW_LIMIT = 5

const AMBER_THRESHOLD = 5
const RED_THRESHOLD = 10

function countPillClass(count: number): string {
  if (count > RED_THRESHOLD) return "bg-red-100 text-red-700"
  if (count > AMBER_THRESHOLD) return "bg-amber-100 text-amber-700"
  return "bg-slate-100 text-slate-700"
}

function CountPill({ count }: { count: number }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium tabular-nums ${countPillClass(count)}`}
    >
      {count}
    </span>
  )
}

// Severity coloring for the BIG headline number. Tuned for "total notes
// across the team" — once you cross 25 the backlog is genuinely concerning,
// 10-24 is "watch it", under 10 is normal operating noise.
function headlineClass(total: number): string {
  if (total >= 25) return "text-red-600"
  if (total >= 10) return "text-amber-600"
  return ""
}

export function NotesOverdueTile({ className }: { className?: string }) {
  const sortedNotes = [...mockOverdueNotes].sort(
    (a, b) =>
      b.overdueCount - a.overdueCount || a.staffName.localeCompare(b.staffName)
  )

  const totalOverdue = sortedNotes.reduce((sum, row) => sum + row.overdueCount, 0)
  const staffWithOverdue = sortedNotes.length
  const previewNotes = sortedNotes.slice(0, PREVIEW_ROW_LIMIT)

  return (
    <Card size="sm" className={cn("w-full", className)}>
      <CardHeader>
        <CardTitle>Notes Overdue</CardTitle>
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
        <div className="flex items-baseline gap-2">
          <span className={`text-4xl font-semibold tabular-nums leading-none ${headlineClass(totalOverdue)}`}>
            {totalOverdue}
          </span>
          <span className="text-xs text-muted-foreground">
            across {staffWithOverdue} staff
          </span>
        </div>

        <ul className="mt-3 space-y-2 border-t pt-3">
          {previewNotes.map((row) => (
            <li
              key={row.staffName}
              className="flex items-center justify-between text-sm"
            >
              <span className="truncate min-w-0 pr-2">{row.staffName}</span>
              <CountPill count={row.overdueCount} />
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  )
}
