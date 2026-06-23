import type { AuthRecord, ClientDetail } from "@/lib/supabase"
import { P } from "./profileTokens"
import { factValue, formatProfileDate } from "./clientProfileUtils"

interface ClientFactsListProps {
  client: ClientDetail
  auth: AuthRecord | null
}

export function ClientFactsList({ client, auth }: ClientFactsListProps) {
  const authStart = client.auth_start_date ?? auth?.startDate ?? null
  const authEnd = client.auth_end_date ?? auth?.endDate ?? null
  const cptDisplay =
    client.cpt_codes && client.cpt_codes.length > 0
      ? client.cpt_codes.join(", ")
      : auth?.cptCode ?? null

  const rows: { label: string; value: string; mono?: boolean }[] = [
    {
      label: "Date of birth",
      value: client.date_of_birth ? formatProfileDate(client.date_of_birth) : factValue(null),
    },
    {
      label: "Home address",
      value: factValue(client.home_address),
    },
    {
      label: "Insurance",
      value: factValue(client.insurance),
    },
    {
      label: "Authorization period",
      value:
        authStart && authEnd
          ? `${formatProfileDate(authStart)} – ${formatProfileDate(authEnd)}`
          : factValue(null),
    },
    {
      label: "CPT / billing code",
      value: cptDisplay ? cptDisplay : factValue(null),
      mono: Boolean(cptDisplay),
    },
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
            className={`text-right text-[15px] ${row.mono ? "font-mono" : ""}`}
            style={{
              color: row.value === "Not on file" ? P.faint : P.ink,
            }}
          >
            {row.value}
          </dd>
        </div>
      ))}
    </dl>
  )
}
