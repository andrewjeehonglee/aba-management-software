import type { AuthRecord } from "@/lib/supabase"
import { P, SECTION_LABEL } from "./profileTokens"
import { authUtilization, formatProfileDate } from "./clientProfileUtils"

interface AuthSummaryProps {
  auth: AuthRecord | null
}

export function AuthSummary({ auth }: AuthSummaryProps) {
  return (
    <div className="mt-6">
      <div
        className="rounded-[12px] px-[18px] py-4"
        style={{ backgroundColor: P.inset }}
      >
        <p className={SECTION_LABEL} style={{ color: P.faint }}>
          Authorized hours
        </p>

        {!auth ? (
          <p className="mt-3 text-[15px]" style={{ color: P.soft }}>
            No active authorization
          </p>
        ) : (
          <AuthNumbers auth={auth} />
        )}
      </div>
    </div>
  )
}

function AuthNumbers({ auth }: { auth: AuthRecord }) {
  const { total, completed, remaining, daysLeft, warn, endDate } = authUtilization(auth)
  const warnInk = warn ? P.amberInk : P.ink
  const dayLabel = daysLeft === 1 ? "day" : "days"
  const expirySuffix =
    daysLeft >= 0
      ? ` · in ${daysLeft} ${dayLabel}`
      : ` · expired ${Math.abs(daysLeft)} ${daysLeft === -1 ? "day" : "days"} ago`

  return (
    <div className="mt-3">
      <div className="grid grid-cols-3 gap-3 text-center">
        <Stat label="Total" value={total} />
        <Stat label="Completed" value={completed} />
        <Stat label="Remaining" value={remaining} valueColor={warnInk} />
      </div>
      <p className="mt-3 text-[14px]" style={{ color: warn ? P.amberInk : P.soft }}>
        Expires {formatProfileDate(endDate)}
        {expirySuffix}
      </p>
    </div>
  )
}

function Stat({
  label,
  value,
  valueColor,
}: {
  label: string
  value: number
  valueColor?: string
}) {
  return (
    <div>
      <p className="text-[26px] font-semibold tabular-nums leading-none" style={{ color: valueColor ?? P.ink }}>
        {value}
      </p>
      <p className="mt-1 text-[12px]" style={{ color: P.faint }}>
        {label}
      </p>
    </div>
  )
}
