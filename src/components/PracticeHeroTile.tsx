import { useEffect, useState } from "react"
import {
  AreaChart,
  Area,
  XAxis,
  ResponsiveContainer,
  Tooltip,
} from "recharts"
import type { DotProps } from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { getPracticeHeroStats, type PracticeHeroStats } from "@/lib/supabase"

// ─── Helpers ──────────────────────────────────────────────────────────────────

const DAY_LETTERS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

function dayLetter(dateStr: string): string {
  // Use noon to avoid DST edge cases
  return DAY_LETTERS[new Date(dateStr + 'T12:00:00').getDay()]
}

function isToday(dateStr: string): boolean {
  const t = new Date()
  const d = new Date(dateStr + 'T12:00:00')
  return d.getDate() === t.getDate() &&
         d.getMonth() === t.getMonth() &&
         d.getFullYear() === t.getFullYear()
}

// ─── Custom chart dot (larger + ring on today) ────────────────────────────────

interface ChartDotProps extends DotProps {
  payload?: { date: string }
}

function ChartDot({ cx, cy, payload }: ChartDotProps) {
  if (cx === undefined || cy === undefined || !payload) return null
  if (!isToday(payload.date)) {
    return <circle cx={cx} cy={cy} r={2.5} fill="#0D7377" />
  }
  return (
    <g>
      <circle cx={cx} cy={cy} r={8} fill="#0D7377" fillOpacity={0.15} />
      <circle cx={cx} cy={cy} r={4} fill="#0D7377" stroke="white" strokeWidth={1.5} />
    </g>
  )
}

// ─── Stat bubbles ─────────────────────────────────────────────────────────────

interface StatBubble {
  value: number
  label: string
  suffix?: string
  color?: string
}

function Bubble({ value, label, suffix = '', color = 'text-[#0D7377]' }: StatBubble) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl bg-[#E8F7F7] px-3 py-3 text-center">
      <p className={`text-3xl font-bold tracking-tight tabular-nums leading-none ${color}`}>
        {value}{suffix}
      </p>
      <p className="mt-1 text-xs text-[#4A5C5C] leading-tight">{label}</p>
    </div>
  )
}

// ─── Component ────────────────────────────────────────────────────────────────

export function PracticeHeroTile() {
  const [stats, setStats] = useState<PracticeHeroStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    getPracticeHeroStats()
      .then(setStats)
      .catch(e => setError((e as Error).message ?? "Failed to load"))
      .finally(() => setLoading(false))
  }, [])

  const chartData = (stats?.dailySessions ?? []).map(d => ({
    date:  d.date,
    count: d.count,
    label: dayLetter(d.date),
  }))

  const completionColor =
    !stats             ? 'text-[#0D7377]' :
    stats.completionRate >= 80 ? 'text-emerald-600' :
    stats.completionRate >= 60 ? 'text-amber-600' :
    'text-red-600'

  return (
    <Card className="w-full shadow-sm">
      <CardHeader className="pb-1">
        <CardTitle className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Session Activity — Last 14 Days
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading && (
          <div className="flex h-40 items-center justify-center text-sm text-muted-foreground animate-pulse">
            Loading…
          </div>
        )}
        {error && (
          <div className="flex h-40 items-center justify-center text-sm text-destructive">
            {error}
          </div>
        )}
        {!loading && !error && stats && (
          <div className="flex flex-col gap-6 lg:flex-row">

            {/* Left 60%: area chart */}
            <div className="min-h-[160px] lg:flex-[3]">
              <ResponsiveContainer width="100%" height={160}>
                <AreaChart
                  data={chartData}
                  margin={{ top: 8, right: 4, left: 0, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="heroGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%"   stopColor="#14A0A5" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="#14A0A5" stopOpacity={0}   />
                    </linearGradient>
                  </defs>
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 11, fill: '#4A5C5C' }}
                    axisLine={false}
                    tickLine={false}
                    interval={0}
                  />
                  <Tooltip
                    contentStyle={{
                      fontSize: 12,
                      border: '1px solid #D0DCDC',
                      borderRadius: 6,
                      background: '#fff',
                    }}
                    formatter={(value: number) => [value, 'Sessions']}
                    labelFormatter={(_label, payload) => {
                      const p = payload?.[0]?.payload as { date?: string } | undefined
                      return p?.date ?? ''
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="count"
                    stroke="#0D7377"
                    strokeWidth={2}
                    fill="url(#heroGradient)"
                    dot={<ChartDot />}
                    activeDot={{ r: 4, fill: '#0D7377' }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Right 40%: 4 stat bubbles */}
            <div className="grid grid-cols-2 gap-3 content-center lg:flex-[2]">
              <Bubble value={stats.sessionsThisWeek}  label="Sessions This Week" />
              <Bubble value={stats.completionRate}    label="Completion Rate"    suffix="%" color={completionColor} />
              <Bubble value={stats.staffOnTrack}      label="Staff Active This Week" />
              <Bubble value={stats.activeClients}     label="Active Clients" />
            </div>

          </div>
        )}
      </CardContent>
    </Card>
  )
}
