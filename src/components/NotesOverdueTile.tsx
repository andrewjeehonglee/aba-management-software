import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { mockOverdueNotes } from "@/data/mockOverdueNotes"

// Color thresholds for the count pill. Strict greater-than so 5 stays gray and
// 10 stays amber — keeps the tiers visually distinct.
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

export function NotesOverdueTile() {
  const sortedNotes = [...mockOverdueNotes].sort(
    (a, b) =>
      b.overdueCount - a.overdueCount || a.staffName.localeCompare(b.staffName)
  )

  const totalOverdue = sortedNotes.reduce((sum, row) => sum + row.overdueCount, 0)
  const staffWithOverdue = sortedNotes.length

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle>Notes Overdue</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-1">
          <div className="text-4xl font-semibold tabular-nums leading-none">
            {totalOverdue}
          </div>
          <div className="text-xs text-muted-foreground">
            across {staffWithOverdue} staff
          </div>
        </div>

        <ul className="mt-4 space-y-2 border-t pt-4">
          {sortedNotes.map((row) => (
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
