import { useState, useEffect } from "react"
import { Plus, TriangleAlert, Users } from "lucide-react"
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { toast } from "sonner"
import { createStaff, getStaff, type StaffRecord } from "@/lib/supabase"
import type { Staff } from "@/types/staff"
import { isStaffFlagged } from "@/lib/staff"
import { toSlug } from "@/lib/slug"
import { cn } from "@/lib/utils"
import type { TeamFilter } from "@/types/team"

// ─── New Staff Modal ──────────────────────────────────────────────────────────

const STAFF_ROLES = ["Technician", "Supervisor", "BCBA", "Owner"] as const
const TEAMS       = ["A", "B", "C"] as const

const EMPTY_STAFF_FORM = { name: "", role: "" as string, team: "" as string }

interface NewStaffModalProps {
  open:         boolean
  practiceId:   string
  onClose:      () => void
  onSuccess:    () => void
}

function NewStaffModal({ open, practiceId, onClose, onSuccess }: NewStaffModalProps) {
  const [form, setForm]       = useState(EMPTY_STAFF_FORM)
  const [error, setError]     = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  function reset() {
    setForm(EMPTY_STAFF_FORM)
    setError(null)
    setLoading(false)
  }

  function handleOpenChange(next: boolean) {
    if (!next) { reset(); onClose() }
  }

  function set<K extends keyof typeof EMPTY_STAFF_FORM>(key: K, value: string) {
    setForm(prev => ({ ...prev, [key]: value }))
  }

  const canSubmit = form.name.trim() && form.role && form.team

  async function handleSubmit() {
    if (!canSubmit) return
    setError(null)
    setLoading(true)
    try {
      await createStaff({
        practiceId,
        name: form.name.trim(),
        role: form.role,
        team: `Team ${form.team}`,
      })
      reset()
      onSuccess()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create staff member.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>New Staff Member</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-1">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">
              Name <span className="text-red-500">*</span>
            </label>
            <Input
              value={form.name}
              onChange={e => set("name", e.target.value)}
              placeholder="e.g. Maria Gonzalez"
              disabled={loading}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">
                Role <span className="text-red-500">*</span>
              </label>
              <Select value={form.role ?? ""} onValueChange={v => set("role", v ?? "")} disabled={loading}>
                <SelectTrigger>
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  {STAFF_ROLES.map(r => (
                    <SelectItem key={r} value={r}>{r}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium">
                Team <span className="text-red-500">*</span>
              </label>
              <Select value={form.team ?? ""} onValueChange={v => set("team", v ?? "")} disabled={loading}>
                <SelectTrigger>
                  <SelectValue placeholder="Select team" />
                </SelectTrigger>
                <SelectContent>
                  {TEAMS.map(t => (
                    <SelectItem key={t} value={t}>Team {t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {error && (
            <p className="rounded-md bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => { reset(); onClose() }}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleSubmit}
              disabled={!canSubmit || loading}
            >
              {loading ? "Saving…" : "Add Staff"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ─── Chart config ─────────────────────────────────────────────────────────────

const chartConfig = {
  directHours: { label: "Direct", color: "#10b981" },
  indirectHours: { label: "Indirect", color: "#94a3b8" },
  cancellationHours: { label: "Cancellation", color: "#ef4444" },
} satisfies ChartConfig

const SORT_OPTIONS = {
  total: {
    label: "Total hours (high → low)",
    compare: (a: StaffRecord, b: StaffRecord) => b.totalHours - a.totalHours,
  },
  directPct: {
    label: "Direct % (low → high)",
    compare: (a: StaffRecord, b: StaffRecord) =>
      a.directHours / a.totalHours - b.directHours / b.totalHours,
  },
  cancellation: {
    label: "Cancellation hrs (high → low)",
    compare: (a: StaffRecord, b: StaffRecord) =>
      b.cancellationHours - a.cancellationHours,
  },
  name: {
    label: "Name (A–Z)",
    compare: (a: StaffRecord, b: StaffRecord) => a.name.localeCompare(b.name),
  },
} as const

type SortKey = keyof typeof SORT_OPTIONS

type AxisTickProps = {
  x?: number | string
  y?: number | string
  payload?: { value: string }
  staff?: StaffRecord[]
}

function YAxisTick({ x = 0, y = 0, payload, staff = [] }: AxisTickProps) {
  if (!payload) return null
  const numX = Number(x)
  const numY = Number(y)
  const member = staff.find((s) => s.name === payload.value)
  const flagged = member ? isStaffFlagged(member as unknown as Staff) : false

  return (
    <g transform={`translate(${numX},${numY})`}>
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

interface HoursByStaffTileProps {
  className?:      string
  teamFilter?:     TeamFilter
  refreshKey?:     number
  practiceId?:     string
  isDemo?:         boolean
  onStaffCreated?: () => void
}

export function HoursByStaffTile({ className, teamFilter, refreshKey, practiceId, isDemo, onStaffCreated }: HoursByStaffTileProps) {
  const [sortKey, setSortKey]     = useState<SortKey>("total")
  const [allStaff, setAllStaff]   = useState<StaffRecord[]>([])
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState<string | null>(null)
  const [modalOpen, setModalOpen] = useState(false)

  useEffect(() => {
    setLoading(true)
    setError(null)
    getStaff()
      .then(setAllStaff)
      .catch((err) => setError(err.message ?? "Failed to load staff"))
      .finally(() => setLoading(false))
  }, [refreshKey])

  const teamStaff = teamFilter && teamFilter !== "All"
    ? allStaff.filter(s => s.team === teamFilter)
    : allStaff

  const sortedStaff = [...teamStaff].sort(SORT_OPTIONS[sortKey].compare)

  return (
    <>
    <Card size="sm" className={cn("w-full", className)}>
      <CardHeader>
        <CardTitle>Hours by Staff (Last 7 Days)</CardTitle>
        <CardAction>
          {practiceId && (
            <Button
              size="sm"
              variant="outline"
              className="h-7 px-2.5 text-xs gap-1 mr-2"
              onClick={() => {
                if (isDemo) { toast.info("Create a free account to save data."); return }
                setModalOpen(true)
              }}
            >
              <Plus className="size-3.5" />
              New Staff
            </Button>
          )}
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
        {loading && (
          <p className="py-10 text-center text-sm text-muted-foreground">Loading…</p>
        )}
        {error && (
          <p className="py-10 text-center text-sm text-destructive">{error}</p>
        )}
        {!loading && !error && sortedStaff.length === 0 && (
          <div className="flex flex-col items-center gap-3 rounded-md border border-dashed border-border py-10 text-center">
            <Users className="w-8 h-8 text-[#14A0A5]" />
            <div className="space-y-1">
              <p className="text-sm font-medium text-[#1E2A2A]">No staff yet</p>
              <p className="text-xs text-muted-foreground max-w-xs">Staff are the BCBAs and RBTs who run sessions and supervise your team.</p>
            </div>
            {practiceId && (
              <button
                className="mt-1 inline-flex items-center rounded-md bg-[#0D7377] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#0a5f63] transition-colors"
                onClick={() => {
                  if (isDemo) { toast.info("Create a free account to save data."); return }
                  setModalOpen(true)
                }}
              >
                Add your first staff member →
              </button>
            )}
          </div>
        )}
        {!loading && !error && sortedStaff.length > 0 && (
          <>
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
                  tick={(props) => <YAxisTick {...props} staff={allStaff} />}
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
          </>
        )}
      </CardContent>
    </Card>

    {practiceId && (
      <NewStaffModal
        open={modalOpen}
        practiceId={practiceId}
        onClose={() => setModalOpen(false)}
        onSuccess={() => { setModalOpen(false); onStaffCreated?.() }}
      />
    )}
    </>
  )
}
