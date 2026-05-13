import { useState } from "react"
import { TriangleAlert } from "lucide-react"
import { Link } from "react-router-dom"
import {
  Bar,
  BarChart,
  CartesianGrid,
  XAxis,
  YAxis,
} from "recharts"
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { mockStaff } from "@/data/mockStaff"
import type { Staff } from "@/types/staff"
import { isStaffFlagged } from "@/lib/staff"
import { toSlug } from "@/lib/slug"
import { cn } from "@/lib/utils"

const chartConfig = {
  directHours: { label: "Direct", color: "#10b981" },
  indirectHours: { label: "Indirect", color: "#94a3b8" },
  cancellationHours: { label: "Cancellation", color: "#ef4444" },
} satisfies ChartConfig

const SORT_OPTIONS = {
  total: {
    label: "Total hours (high → low)",
    compare: (a: Staff, b: Staff) => b.totalHours - a.totalHours,
  },
  directPct: {
    label: "Direct % (low → high)",
    compare: (a: Staff, b: Staff) =>
      a.directHours / a.totalHours - b.directHours / b.totalHours,
  },
  cancellation: {
    label: "Cancellation hrs (high → low)",
    compare: (a: Staff, b: Staff) =>
      b.cancellationHours - a.cancellationHours,
  },
  name: {
    label: "Name (A–Z)",
    compare: (a: Staff, b: Staff) => a.name.localeCompare(b.name),
  },
} as const

type SortKey = keyof typeof SORT_OPTIONS

type AxisTickProps = {
  x?: number
  y?: number
  payload?: { value: string }
}

function YAxisTick({ x = 0, y = 0, payload }: AxisTickProps) {
  if (!payload) return null
  const staff = mockStaff.find((s) => s.name === payload.value)
  const flagged = staff ? isStaffFlagged(staff) : false

  return (
    <g transform={`translate(${x},${y})`}>
      <foreignObject x={-120} y={-10} width={116} height={20}>
        <div
          className={`flex h-full items-center justify-end gap-1 text-xs ${
            flagged ? "font-medium text-amber-600" : "text-foreground"
          }`}
        >
          {flagged && (
            <>
              <TriangleAlert className="h-3.5 w-3.5" aria-hidden="true" />
              <span className="sr-only">
                Flagged: less than 50% direct hours.
              </span>
            </>
          )}
          <Link
            to={"/staff/" + toSlug(payload.value)}
            className="hover:underline underline-offset-2"
          >
            {payload.value}
          </Link>
        </div>
      </foreignObject>
    </g>
  )
}

export function HoursByStaffTile({ className }: { className?: string }) {
  // Default sort is now "total" — for the dashboard preview we want the top
  // earners visible first; A-Z is more useful in the future "View all" page.
  const [sortKey, setSortKey] = useState<SortKey>("total")

  // Show all 13 staff so the cross-tile narrative holds: David Kim, Olivia
  // Park, and Tyler Brooks must be visible here (they're flagged in the other
  // staff tiles too). Slicing would silently break the demo arc.
  const sortedStaff = [...mockStaff].sort(SORT_OPTIONS[sortKey].compare)

  return (
    <Card size="sm" className={cn("w-full", className)}>
      <CardHeader>
        <CardTitle>Hours by Staff (Last 7 Days)</CardTitle>
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
        <div className="mb-2 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
          {Object.entries(chartConfig).map(([key, { label, color }]) => (
            <div key={key} className="flex items-center gap-1.5">
              <span
                className="inline-block h-3 w-3 rounded-sm"
                style={{ backgroundColor: color }}
                aria-hidden="true"
              />
              <span>{label}</span>
            </div>
          ))}
        </div>

        <ChartContainer
          config={chartConfig}
          className="aspect-auto h-[380px] w-full"
        >
          <BarChart
            data={sortedStaff}
            layout="vertical"
            margin={{ top: 4, right: 12, left: 12, bottom: 4 }}
          >
            <CartesianGrid horizontal={false} strokeDasharray="3 3" />
            <XAxis
              type="number"
              tick={{ fontSize: 11 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              type="category"
              dataKey="name"
              width={120}
              interval={0}
              tick={<YAxisTick />}
              axisLine={false}
              tickLine={false}
            />
            <ChartTooltip
              content={<ChartTooltipContent indicator="dot" />}
            />
            <Bar
              dataKey="directHours"
              stackId="hours"
              fill="var(--color-directHours)"
            />
            <Bar
              dataKey="indirectHours"
              stackId="hours"
              fill="var(--color-indirectHours)"
            />
            <Bar
              dataKey="cancellationHours"
              stackId="hours"
              fill="var(--color-cancellationHours)"
            />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
