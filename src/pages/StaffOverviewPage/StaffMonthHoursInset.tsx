import { P, SECTION_LABEL } from "@/pages/ClientOverviewPage/profileTokens"

interface StaffMonthHoursInsetProps {
  directHours: number
  indirectHours: number
  monthLabel: string
  loading?: boolean
}

export function StaffMonthHoursInset({
  directHours,
  indirectHours,
  monthLabel,
  loading,
}: StaffMonthHoursInsetProps) {
  const totalHours = directHours + indirectHours

  return (
    <div className="mt-6">
      <div
        className="rounded-[12px] px-[18px] py-4"
        style={{ backgroundColor: P.inset }}
      >
        <p className={SECTION_LABEL} style={{ color: P.faint }}>
          This month
        </p>

        {loading ? (
          <p className="mt-3 text-[15px] animate-pulse" style={{ color: P.faint }}>
            Loading…
          </p>
        ) : (
          <>
            <div className="mt-3 grid grid-cols-3 gap-3 text-center">
              <Stat label="Direct hrs" value={directHours} />
              <Stat label="Indirect hrs" value={indirectHours} />
              <Stat label="Total hrs" value={totalHours} />
            </div>
            <p className="mt-3 text-[14px]" style={{ color: P.soft }}>
              {monthLabel}
            </p>
          </>
        )}
      </div>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <p
        className="text-[26px] font-semibold tabular-nums leading-none"
        style={{ color: P.ink }}
      >
        {value}
      </p>
      <p className="mt-1 text-[12px]" style={{ color: P.faint }}>
        {label}
      </p>
    </div>
  )
}
