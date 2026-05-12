import { TriangleAlert, type LucideIcon } from "lucide-react"
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from "recharts"
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card"
import { mockStaff } from "@/data/mockStaff"
import { isStaffFlagged } from "@/lib/staff"

const COLOR_DIRECT = "#10b981"
const COLOR_INDIRECT = "#94a3b8"
const COLOR_CANCELLATION = "#ef4444"

type KeyItemProps = {
  label: string
  color?: string
  icon?: LucideIcon
}

function KeyItem({ label, color, icon: Icon }: KeyItemProps) {
  return (
    <div className="flex items-center gap-1.5">
      {color && (
        <span
          className="inline-block h-3 w-3 rounded-sm"
          style={{ backgroundColor: color }}
          aria-hidden="true"
        />
      )}
      {Icon && (
        <Icon className="h-3.5 w-3.5 text-amber-500" aria-hidden="true" />
      )}
      <span>{label}</span>
    </div>
  )
}

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
          <span>{payload.value}</span>
        </div>
      </foreignObject>
    </g>
  )
}

export function HoursByStaffTile() {
  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle>Hours by Staff (Last 7 Days)</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
          <KeyItem color={COLOR_DIRECT} label="Direct" />
          <KeyItem color={COLOR_INDIRECT} label="Indirect" />
          <KeyItem color={COLOR_CANCELLATION} label="Cancellation" />
          <KeyItem icon={TriangleAlert} label="Below 50% direct" />
        </div>

        <ResponsiveContainer width="100%" height={460}>
          <BarChart
            data={mockStaff}
            layout="vertical"
            margin={{ top: 8, right: 16, left: 16, bottom: 8 }}
          >
            <CartesianGrid
              horizontal={false}
              strokeDasharray="3 3"
              stroke="#f1f5f9"
            />
            <XAxis
              type="number"
              tick={{ fontSize: 11, fill: "#94a3b8" }}
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
            <Bar dataKey="directHours" stackId="hours" fill={COLOR_DIRECT} />
            <Bar dataKey="indirectHours" stackId="hours" fill={COLOR_INDIRECT} />
            <Bar
              dataKey="cancellationHours"
              stackId="hours"
              fill={COLOR_CANCELLATION}
            />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
