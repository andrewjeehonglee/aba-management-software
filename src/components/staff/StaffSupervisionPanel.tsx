import { Link } from "react-router-dom"
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { staffProfilePath } from "@/lib/rosterScope"
import {
  SUPERVISION_THRESHOLD,
  actualSupervisionHours,
  complianceClasses,
  complianceStatus,
  requiredHours,
  type ComplianceStatus,
} from "@/lib/supervision"
import { cn } from "@/lib/utils"
import type { StaffRecord, SupervisionRecord } from "@/lib/supabase"

const COMPLIANCE_CONFIG: Record<
  ComplianceStatus,
  { label: string; className: string }
> = {
  compliant:       { label: "Compliant",     className: "bg-emerald-100 text-emerald-800" },
  "at-risk":       { label: "At risk",       className: "bg-amber-100 text-amber-800" },
  "non-compliant": { label: "Non-compliant", className: "bg-red-100 text-red-800" },
}

function ComplianceBadge({ status }: { status: ComplianceStatus }) {
  const { label, className } = COMPLIANCE_CONFIG[status]
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${className}`}
    >
      {label}
    </span>
  )
}

function BtSupervisionContent({
  supervision,
  staff,
  monthLabel,
}: {
  supervision: SupervisionRecord
  staff: StaffRecord
  monthLabel: string
}) {
  const { bar, text } = complianceClasses(supervision.supervisionPct)
  const status = complianceStatus(supervision.supervisionPct)
  const actual = actualSupervisionHours(supervision.supervisionPct, staff.totalHours)
  const required = requiredHours(staff.totalHours)

  return (
    <div className="flex h-full flex-col justify-between gap-4">
      <div className="flex items-baseline justify-between gap-3">
        <span className={`text-3xl font-bold tabular-nums ${text}`}>
          {supervision.supervisionPct.toFixed(1)}%
        </span>
        <ComplianceBadge status={status} />
      </div>

      <div className="relative h-2.5 w-full overflow-hidden rounded-full bg-slate-200">
        <div
          className={`h-full ${bar}`}
          style={{ width: `${Math.min(supervision.supervisionPct, 100)}%` }}
        />
        <div
          className="absolute inset-y-0 w-px bg-slate-500/70"
          style={{ left: `${SUPERVISION_THRESHOLD}%` }}
          aria-hidden="true"
        />
      </div>

      <p className="text-xs text-muted-foreground">
        <span className="font-medium tabular-nums text-foreground">{actual}</span>
        {" of "}
        <span className="font-medium tabular-nums text-foreground">{required}</span>
        {" required supervision hours in "}
        {monthLabel}
      </p>
    </div>
  )
}

function LeadershipSupervisionTable({
  records,
  monthLabel,
}: {
  records: SupervisionRecord[]
  monthLabel: string
}) {
  const monthName = monthLabel.split(" ")[0]

  if (records.length === 0) {
    return (
      <div className="rounded-md border border-dashed border-border py-8 text-center text-sm text-muted-foreground">
        No BTs on shared caseload yet.
      </div>
    )
  }

  return (
    <div className="max-h-[11.5rem] overflow-y-auto pr-0.5">
      <table className="w-full text-sm">
        <thead className="sticky top-0 bg-card">
          <tr className="border-b text-left text-xs text-muted-foreground">
            <th className="pb-2 pr-3 font-medium">Staff</th>
            <th className="pb-2 pr-3 font-medium text-right tabular-nums">%</th>
            <th className="pb-2 font-medium">Status</th>
          </tr>
        </thead>
        <tbody>
          {records.map((row) => {
            const status = complianceStatus(row.supervisionPct)
            return (
              <tr key={row.staffId} className="border-b border-border/50 last:border-0">
                <td className="py-1.5 pr-3">
                  {row.staffExternalCode ? (
                    <Link
                      to={staffProfilePath(row.staffExternalCode)}
                      className="font-medium hover:underline underline-offset-2"
                    >
                      {row.staffName}
                    </Link>
                  ) : (
                    row.staffName
                  )}
                </td>
                <td className="py-1.5 pr-3 text-right tabular-nums font-medium">
                  {row.supervisionPct.toFixed(1)}%
                </td>
                <td className="py-1.5">
                  <ComplianceBadge status={status} />
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
      <p className="mt-2 text-[11px] text-muted-foreground">{monthName} compliance</p>
    </div>
  )
}

interface StaffSupervisionPanelProps {
  className?: string
  monthLabel: string
  mode: "technician" | "leadership"
  supervision?: SupervisionRecord | null
  staff?: StaffRecord
  caseloadRecords?: SupervisionRecord[]
}

export function StaffSupervisionPanel({
  className,
  monthLabel,
  mode,
  supervision,
  staff,
  caseloadRecords = [],
}: StaffSupervisionPanelProps) {
  const title =
    mode === "technician"
      ? "Supervision compliance"
      : "Staff supervision compliance"

  return (
    <Card size="sm" className={cn("flex h-full flex-col", className)}>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent className="flex-1">
        {mode === "technician" ? (
          supervision && staff ? (
            <BtSupervisionContent
              supervision={supervision}
              staff={staff}
              monthLabel={monthLabel}
            />
          ) : (
            <div className="rounded-md border border-dashed border-border py-8 text-center text-sm text-muted-foreground">
              No supervision data available.
            </div>
          )
        ) : (
          <LeadershipSupervisionTable
            records={caseloadRecords}
            monthLabel={monthLabel}
          />
        )}
      </CardContent>
      {mode === "leadership" && caseloadRecords.length > 0 && (
        <CardFooter className="border-t bg-slate-50/80 px-4 py-2 text-[11px] text-muted-foreground">
          RBTs below {SUPERVISION_THRESHOLD}% flagged · {monthLabel}
        </CardFooter>
      )}
    </Card>
  )
}
