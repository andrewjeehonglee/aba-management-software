import type { RosterStaffRole } from "@/lib/staffRole"
import { isTechnicianRole } from "@/lib/staffRole"
import { P, SECTION_LABEL } from "@/pages/ClientOverviewPage/profileTokens"

interface StaffMonthHoursInsetProps {
  directHours: number
  indirectHours: number
  monthLabel: string
  role: RosterStaffRole
  loading?: boolean
}

export function StaffMonthHoursInset({
  directHours,
  indirectHours,
  monthLabel,
  role,
  loading,
}: StaffMonthHoursInsetProps) {
  const totalHours = directHours + indirectHours
  const directPct =
    totalHours > 0 ? Math.round((directHours / totalHours) * 100) : null

  const pctDisplay = directPct === null ? "—" : `${directPct}%`
  const colorDirectPct = () => {
    if (directPct === null) return P.ink
    if (!isTechnicianRole(role)) return P.ink
    return directPct < 50 ? P.amberInk : P.sageInk
  }

  return (
    <div className="mt-6">
      <div
        className="rounded-[12px] px-[18px] py-4"
        style={{ backgroundColor: P.inset }}
      >
        <div className="flex items-baseline justify-between gap-3">
          <p className={SECTION_LABEL} style={{ color: P.faint }}>
            This month
          </p>
          {!loading && (
            <p className="text-[13px]" style={{ color: P.soft }}>
              {monthLabel}
            </p>
          )}
        </div>

        {loading ? (
          <p className="mt-3 text-[15px] animate-pulse" style={{ color: P.faint }}>
            Loading…
          </p>
        ) : (
          <div className="mt-3 grid grid-cols-3 gap-3 text-center">
            <Stat label="Total hrs" value={totalHours} />
            <Stat label="Direct hrs" value={directHours} />
            <Stat label="Direct %" value={pctDisplay} valueColor={colorDirectPct()} />
          </div>
        )}
      </div>
    </div>
  )
}

function Stat({
  label,
  value,
  valueColor,
}: {
  label: string
  value: number | string
  valueColor?: string
}) {
  return (
    <div>
      <p
        className="text-[26px] font-semibold tabular-nums leading-none"
        style={{ color: valueColor ?? P.ink }}
      >
        {value}
      </p>
      <p className="mt-1 text-[12px]" style={{ color: P.faint }}>
        {label}
      </p>
    </div>
  )
}
