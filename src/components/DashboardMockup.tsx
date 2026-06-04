/**
 * Styled dashboard mockup used in the landing page hero and the AuthPage left
 * panel. Pass size="sm" for the compact AuthPage variant (default), or
 * size="lg" for the larger landing-page hero variant.
 */

interface DashboardMockupProps {
  size?: "sm" | "lg"
}

const SESSIONS_SM = [
  { name: "Emma R.",     time: "8:00 AM",  dot: "#4ade80" },
  { name: "Liam T.",     time: "9:00 AM",  dot: "#fbbf24" },
  { name: "Isabella J.", time: "10:00 AM", dot: "#f87171" },
]

const SESSIONS_LG = [
  { name: "Emma R.",     time: "8:00 AM",  status: "Complete",    dot: "#4ade80" },
  { name: "Liam T.",     time: "9:30 AM",  status: "In Progress", dot: "#fbbf24" },
  { name: "Isabella J.", time: "11:00 AM", status: "Scheduled",   dot: "#94a3b8" },
  { name: "Noah C.",     time: "1:00 PM",  status: "Scheduled",   dot: "#94a3b8" },
]

const BAR_HEIGHTS = [55, 70, 45, 80, 60, 75, 50]
const BAR_DAYS    = ["M", "T", "W", "T", "F", "S", "S"]

export function DashboardMockup({ size = "sm" }: DashboardMockupProps) {
  if (size === "sm") {
    return (
      <div className="w-full max-w-xs rounded-xl border border-white/15 bg-white/10 p-3 backdrop-blur-sm">
        {/* Header bar */}
        <div className="mb-2.5 flex items-center justify-between px-0.5">
          <div className="h-2 w-10 rounded-full bg-white/60" />
          <div className="flex gap-1">
            <div className="h-1.5 w-5 rounded-full bg-white/30" />
            <div className="h-1.5 w-5 rounded-full bg-white/20" />
          </div>
        </div>

        {/* KPI row */}
        <div className="grid grid-cols-3 gap-1.5 mb-1.5">
          <div className="rounded-lg bg-white/15 p-2">
            <div className="text-base font-bold text-white tabular-nums">28</div>
            <div className="mt-1 h-1 w-8 rounded-full bg-white/25" />
          </div>
          <div className="rounded-lg border border-red-300/40 bg-red-400/20 p-2">
            <div className="text-base font-bold text-white tabular-nums">2</div>
            <div className="mt-1 h-1 w-6 rounded-full bg-white/25" />
          </div>
          <div className="rounded-lg bg-white/15 p-2">
            <div className="text-base font-bold text-white tabular-nums">91%</div>
            <div className="mt-1 h-1 w-5 rounded-full bg-white/25" />
          </div>
        </div>

        {/* Session list */}
        <div className="rounded-lg bg-white/15 px-2.5 py-2 space-y-1.5">
          {SESSIONS_SM.map(({ name, time, dot }) => (
            <div key={name} className="flex items-center gap-2">
              <div className="h-1.5 w-1.5 rounded-full shrink-0" style={{ backgroundColor: dot }} />
              <div className="h-1.5 flex-1 rounded-full bg-white/30" />
              <div className="text-[8px] text-white/50 tabular-nums shrink-0">{time}</div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  // ── Large variant ─────────────────────────────────────────────────────────
  return (
    <div className="w-full rounded-2xl overflow-hidden shadow-2xl ring-1 ring-black/8">

      {/* App header */}
      <div className="flex items-center justify-between bg-[#0D7377] px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold tracking-tight text-white">Pulse</span>
          <span className="rounded-full bg-white/15 px-2 py-0.5 text-[10px] text-white/80">Owner</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-1.5 w-12 rounded-full bg-white/20" />
          <div className="h-5 w-5 rounded-full bg-white/15" />
        </div>
      </div>

      {/* Dashboard body */}
      <div className="bg-[#F0F4F4] p-3 space-y-2.5">

        {/* KPI row */}
        <div className="grid grid-cols-3 gap-2">
          {[
            { value: "28",  label: "Sessions today", accent: "bg-white" },
            { value: "2",   label: "Overdue notes",  accent: "bg-red-50 ring-1 ring-red-200" },
            { value: "91%", label: "Supervision",    accent: "bg-white" },
          ].map(({ value, label, accent }) => (
            <div key={label} className={`rounded-xl ${accent} px-3 py-2.5`}>
              <div className="text-lg font-bold tabular-nums text-[#1E2A2A]">{value}</div>
              <div className="mt-0.5 text-[10px] text-[#4A5C5C] leading-tight">{label}</div>
            </div>
          ))}
        </div>

        {/* Bar chart — Hours by Staff */}
        <div className="rounded-xl bg-white px-3 py-2.5">
          <div className="mb-2 text-[10px] font-medium text-[#4A5C5C]">Hours by staff · this week</div>
          <div className="flex items-end gap-1 h-10">
            {BAR_HEIGHTS.map((h, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-0.5">
                <div
                  className="w-full rounded-sm"
                  style={{ height: `${h}%`, backgroundColor: i === 3 ? "#0D7377" : "#14A0A5", opacity: i === 3 ? 1 : 0.55 }}
                />
                <span className="text-[8px] text-[#4A5C5C]">{BAR_DAYS[i]}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Auth utilization bar */}
        <div className="rounded-xl bg-white px-3 py-2.5">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] font-medium text-[#4A5C5C]">Authorization utilization</span>
            <span className="text-[10px] font-semibold text-[#0D7377]">78%</span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-[#E8F7F7]">
            <div className="h-1.5 rounded-full bg-[#0D7377]" style={{ width: "78%" }} />
          </div>
        </div>

        {/* Today's sessions */}
        <div className="rounded-xl bg-white px-3 py-2.5">
          <div className="mb-2 text-[10px] font-medium text-[#4A5C5C]">Today's sessions</div>
          <div className="space-y-1.5">
            {SESSIONS_LG.map(({ name, time, status, dot }) => (
              <div key={name} className="flex items-center gap-2">
                <div className="h-1.5 w-1.5 rounded-full shrink-0" style={{ backgroundColor: dot }} />
                <span className="text-[10px] font-medium text-[#1E2A2A] flex-1">{name}</span>
                <span className="text-[9px] text-[#4A5C5C] tabular-nums">{time}</span>
                <span
                  className="rounded-full px-1.5 py-0.5 text-[8px] font-medium"
                  style={{
                    backgroundColor: status === "Complete" ? "#dcfce7" : status === "In Progress" ? "#fef9c3" : "#f1f5f9",
                    color: status === "Complete" ? "#15803d" : status === "In Progress" ? "#854d0e" : "#64748b",
                  }}
                >
                  {status}
                </span>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  )
}
