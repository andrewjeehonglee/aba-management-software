import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  XAxis,
  YAxis,
} from "recharts"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import { mockGoalHistory } from "@/data/mockGoalHistory"
import type { Goal, GoalStatus } from "@/types/goal"

// Goal status display — inlined because this is the only place it's
// rendered at this fidelity (the list card uses a simpler badge-only
// version). If a third caller appears, extract to src/lib/goals.ts.
const GOAL_STATUS_CONFIG: Record<GoalStatus, { label: string; className: string }> = {
  "under-progress":  { label: "Under progress",  className: "bg-red-100 text-red-800" },
  "in-progress":     { label: "In progress",     className: "bg-slate-100 text-slate-700" },
  "nearing-mastery": { label: "Nearing mastery", className: "bg-amber-100 text-amber-800" },
  mastered:          { label: "Mastered",        className: "bg-emerald-100 text-emerald-800" },
}

// Streak label — copied format from ClientOverviewPage's formatStreak so
// the modal reads identically to the row that opened it.
function formatStreak(days: number, pct: number): string {
  if (days === 0) return `No current streak at ${pct}%`
  if (days === 1) return `1 day in a row at ${pct}%`
  return `${days} days in a row at ${pct}%`
}

const chartConfig = {
  session: { label: "Session %",    color: "#2563eb" }, // blue-600
  average: { label: "3-session avg", color: "#16a34a" }, // green-600
} satisfies ChartConfig

const MASTERY_LINE_COLOR = "#dc2626" // red-600

interface GoalDetailModalProps {
  goal: Goal | null
  onClose: () => void
}

export function GoalDetailModal({ goal, onClose }: GoalDetailModalProps) {
  const history = goal ? mockGoalHistory[goal.id] : undefined
  const status = goal ? GOAL_STATUS_CONFIG[goal.status] : undefined

  return (
    <Dialog open={goal !== null} onOpenChange={(open: boolean) => { if (!open) onClose() }}>
      <DialogContent className="sm:max-w-2xl">
        {goal && history && status && (
          <>
            <DialogHeader>
              <DialogTitle className="text-xl leading-snug pr-6">
                {goal.name}
              </DialogTitle>
            </DialogHeader>

            {/* Metadata row — mastery criterion + status chip */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">
                  Mastery criterion
                </p>
                <p className="text-sm">{goal.masteryTarget}</p>
              </div>
              <div className="flex flex-col items-end gap-1.5 shrink-0">
                <span
                  className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${status.className}`}
                >
                  {status.label}
                </span>
                <span className="text-xs tabular-nums text-muted-foreground">
                  {formatStreak(goal.streakDays, goal.streakPercent)}
                </span>
              </div>
            </div>

            {/* Chart */}
            <div>
              <p className="mb-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Progress — last 6 months
              </p>

              <ChartContainer config={chartConfig} className="h-[280px] w-full">
                <LineChart
                  data={history.points}
                  margin={{ top: 8, right: 8, bottom: 0, left: 0 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="hsl(var(--border))"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="idx"
                    type="number"
                    domain={["dataMin", "dataMax"]}
                    ticks={[0, 4, 8, 12, 16, 20, 24]}
                    tickFormatter={(i: number) => history.points[i]?.date ?? ""}
                    tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    domain={[0, 100]}
                    tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                    tickFormatter={(v: number) => `${v}%`}
                    tickLine={false}
                    axisLine={false}
                    width={34}
                  />
                  <ChartTooltip
                    content={
                      <ChartTooltipContent
                        formatter={(value) => `${value}%`}
                        labelFormatter={(_idx, payload) =>
                          payload?.[0]?.payload?.date ?? ""
                        }
                      />
                    }
                  />

                  {/* Mastery threshold reference line — red dashed */}
                  <ReferenceLine
                    y={history.masteryThreshold}
                    stroke={MASTERY_LINE_COLOR}
                    strokeDasharray="5 3"
                    strokeWidth={1.5}
                    label={{
                      value: `${history.masteryThreshold}% mastery`,
                      position: "insideTopRight",
                      fontSize: 10,
                      fill: MASTERY_LINE_COLOR,
                      dy: -6,
                    }}
                  />

                  {/* Session % — blue solid line, dot at every data point */}
                  <Line
                    dataKey="session"
                    name="Session %"
                    stroke="var(--color-session)"
                    strokeWidth={2.5}
                    dot={{ r: 3, fill: "var(--color-session)", strokeWidth: 0 }}
                    activeDot={{ r: 5 }}
                  />

                  {/* Rolling average — green dashed line, no per-point dots */}
                  <Line
                    dataKey="average"
                    name="3-session avg"
                    stroke="var(--color-average)"
                    strokeWidth={2.5}
                    strokeDasharray="4 3"
                    dot={false}
                    activeDot={{ r: 4 }}
                  />
                </LineChart>
              </ChartContainer>

              {/* Manual legend — avoids Recharts Legend alphabetical-sort bug
                  we hit in Session 5 (HoursByStaffTile). */}
              <div className="mt-3 flex items-center gap-5 justify-center">
                <div className="flex items-center gap-1.5">
                  <div
                    className="h-px w-6"
                    style={{ backgroundColor: "var(--color-session)", height: "2px" }}
                    aria-hidden="true"
                  />
                  <span className="text-xs text-muted-foreground">Session %</span>
                </div>
                <div className="flex items-center gap-1.5">
                  {/* Dashed line swatch */}
                  <svg width="24" height="2" aria-hidden="true">
                    <line
                      x1="0" y1="1" x2="24" y2="1"
                      stroke="var(--color-average)"
                      strokeWidth="2"
                      strokeDasharray="4 3"
                    />
                  </svg>
                  <span className="text-xs text-muted-foreground">3-session avg</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <svg width="24" height="2" aria-hidden="true">
                    <line
                      x1="0" y1="1" x2="24" y2="1"
                      stroke={MASTERY_LINE_COLOR}
                      strokeWidth="1.5"
                      strokeDasharray="5 3"
                    />
                  </svg>
                  <span className="text-xs text-muted-foreground">
                    Mastery ({history.masteryThreshold}%)
                  </span>
                </div>
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
