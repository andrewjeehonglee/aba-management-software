import { useState } from "react"
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
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { updateGoalStatus } from "@/lib/supabase"
import { mockGoalHistory } from "@/data/mockGoalHistory"
import type { Goal, GoalStatus } from "@/types/goal"

const GOAL_STATUS_CONFIG: Record<GoalStatus, { label: string; className: string }> = {
  "in-progress": { label: "In progress",  className: "bg-blue-100 text-blue-800"       },
  hold:          { label: "Hold",         className: "bg-amber-100 text-amber-800"     },
  discontinued:  { label: "Discontinued", className: "bg-gray-100 text-gray-500"       },
  mastered:      { label: "Mastered",     className: "bg-emerald-100 text-emerald-800" },
}

const GOAL_STATUS_ORDER: GoalStatus[] = ["in-progress", "hold", "mastered", "discontinued"]

function formatStreak(days: number, pct: number): string {
  if (days === 0) return `No current streak at ${pct}%`
  if (days === 1) return `1 day in a row at ${pct}%`
  return `${days} days in a row at ${pct}%`
}

const chartConfig = {
  session: { label: "Session %",    color: "#2563eb" },
  average: { label: "3-session avg", color: "#16a34a" },
} satisfies ChartConfig

const MASTERY_LINE_COLOR = "#dc2626"

interface GoalDetailModalProps {
  goal: Goal | null
  onClose: () => void
}

// Local editable state — separate from the read-only goal prop so edits
// never mutate the parent's data until Save is clicked.
interface EditState {
  status: GoalStatus
  masteryTarget: string
}

export function GoalDetailModal({ goal, onClose }: GoalDetailModalProps) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState<EditState | null>(null)

  // Committed (saved) overrides — start undefined; updated on Save.
  const [saved, setSaved] = useState<Partial<EditState>>({})

  const history = goal ? mockGoalHistory[goal.id] : undefined

  // Merge saved overrides onto the original goal so view mode always shows
  // the most recently saved values.
  const displayStatus: GoalStatus = saved.status ?? goal?.status ?? "in-progress"
  const displayMastery: string = saved.masteryTarget ?? goal?.masteryTarget ?? ""
  const statusCfg = GOAL_STATUS_CONFIG[displayStatus]

  function openEdit() {
    setDraft({ status: displayStatus, masteryTarget: displayMastery })
    setEditing(true)
  }

  function cancelEdit() {
    setDraft(null)
    setEditing(false)
  }

  function saveEdit() {
    if (draft) {
      setSaved(draft)
      updateGoalStatus(goal!.id, draft.status, draft.masteryTarget || undefined).catch(() => {})
    }
    setDraft(null)
    setEditing(false)
  }

  // Reset local state whenever a different goal is opened so stale saves
  // from a previous goal don't bleed into the next one.
  function handleOpenChange(open: boolean) {
    if (!open) {
      setEditing(false)
      setDraft(null)
      setSaved({})
      onClose()
    }
  }

  return (
    <Dialog open={goal !== null} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        {goal && history && (
          <>
            <DialogHeader>
              {/* Title row — goal name left, Edit button right (sits beside
                  the close button that DialogContent renders absolutely) */}
              <div className="flex items-start justify-between gap-3 pr-8">
                <DialogTitle className="text-xl leading-snug">
                  {goal.name}
                </DialogTitle>
                {!editing && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={openEdit}
                    className="shrink-0 h-7 px-2.5 text-xs"
                  >
                    Edit
                  </Button>
                )}
              </div>
            </DialogHeader>

            {/* ── VIEW MODE ── */}
            {!editing && (
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">
                    Mastery criterion
                  </p>
                  <p className="text-sm">{displayMastery}</p>
                </div>
                <div className="flex flex-col items-end gap-1.5 shrink-0">
                  <span
                    className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${statusCfg.className}`}
                  >
                    {statusCfg.label}
                  </span>
                  <span className="text-xs tabular-nums text-muted-foreground">
                    {formatStreak(goal.streakDays, goal.streakPercent)}
                  </span>
                </div>
              </div>
            )}

            {/* ── EDIT MODE ── */}
            {editing && draft && (
              <div className="border-b border-border pb-4 space-y-4">
                {/* Status picker */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Status
                  </label>
                  <Select
                    value={draft.status}
                    onValueChange={(val) =>
                      setDraft((d) => d && { ...d, status: val as GoalStatus })
                    }
                  >
                    <SelectTrigger className="h-8 w-[180px] text-sm">
                      <SelectValue>
                        {GOAL_STATUS_CONFIG[draft.status].label}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {GOAL_STATUS_ORDER.map((s) => (
                        <SelectItem key={s} value={s} className="text-sm">
                          {GOAL_STATUS_CONFIG[s].label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Mastery criterion */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Mastery criterion
                  </label>
                  <Input
                    value={draft.masteryTarget}
                    onChange={(e) =>
                      setDraft((d) => d && { ...d, masteryTarget: e.target.value })
                    }
                    className="text-sm"
                  />
                </div>

                {/* Save / Cancel */}
                <div className="flex items-center gap-2 pt-1">
                  <Button size="sm" onClick={saveEdit} className="h-7 px-3 text-xs">
                    Save
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={cancelEdit}
                    className="h-7 px-3 text-xs"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}

            {/* ── CHART (always visible) ── */}
            <div>
              <p className="mb-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Progress — last 6 months
              </p>

              {/* Legend — pill badges above the chart */}
              <div className="mb-3 flex items-center gap-3">
                {/* Blue filled pill — solid session line */}
                <span className="inline-flex items-center rounded-full bg-blue-600 px-2.5 py-0.5 text-xs font-semibold text-white">
                  Per-session score
                </span>
                {/* Green dashed-border pill — rolling average line */}
                <span className="inline-flex items-center rounded-full border-2 border-dashed border-green-600 px-2.5 py-0.5 text-xs font-semibold text-green-700">
                  Rolling average
                </span>
                {/* Red dashed-border pill — mastery reference line */}
                <span className="inline-flex items-center rounded-full border-2 border-dashed border-red-600 px-2.5 py-0.5 text-xs font-semibold text-red-700">
                  Mastery criterion
                </span>
              </div>

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

                  <Line
                    dataKey="session"
                    name="Session %"
                    stroke="var(--color-session)"
                    strokeWidth={2.5}
                    dot={{ r: 3, fill: "var(--color-session)", strokeWidth: 0 }}
                    activeDot={{ r: 5 }}
                  />

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

            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
