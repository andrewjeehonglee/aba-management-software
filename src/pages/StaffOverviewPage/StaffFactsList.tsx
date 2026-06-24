import type { StaffRecord } from "@/lib/supabase"
import type { RosterStaffRole } from "@/lib/staffRole"
import { P } from "@/pages/ClientOverviewPage/profileTokens"
import { certExpiryDisplay, factValue, formatProfileDate, roleFactLabel } from "./staffProfileUtils"

interface StaffFactsListProps {
  staff: StaffRecord
  role: RosterStaffRole
  phone: string
  email: string
}

export function StaffFactsList({ staff, role, phone, email }: StaffFactsListProps) {
  const certRow = staff.certification
    ? certExpiryDisplay(staff.certification)
    : { label: factValue(null), ink: undefined }

  const rows: { label: string; value: string; ink?: string }[] = [
    { label: "Role", value: roleFactLabel(role) },
    { label: "Hired", value: formatProfileDate(staff.hireDate) },
    { label: "Certification", value: certRow.label, ink: certRow.ink },
    { label: "Phone", value: factValue(phone) },
    { label: "Email", value: factValue(email) },
  ]

  return (
    <dl>
      {rows.map((row, index) => (
        <div
          key={row.label}
          className="flex items-baseline justify-between gap-4 py-3 text-[15px] first:pt-0"
          style={{
            borderTop: index > 0 ? `1px solid ${P.rule}` : undefined,
          }}
        >
          <dt style={{ color: P.soft }}>{row.label}</dt>
          <dd
            className="text-right text-[15px]"
            style={{
              color:
                row.value === "Not on file"
                  ? P.faint
                  : row.ink ?? P.ink,
            }}
          >
            {row.value}
          </dd>
        </div>
      ))}
    </dl>
  )
}
