import { useEffect, useState } from "react"
import { AlertCircle } from "lucide-react"
import { Link } from "react-router-dom"
import { getCareTeamDetailsForClient } from "@/lib/clientAssignments"
import { staffProfilePath } from "@/lib/rosterScope"
import { P, SECTION_LABEL } from "./profileTokens"

interface CareTeamProps {
  clientId: string
  legacyStaffName?: string
}

export function CareTeam({ clientId, legacyStaffName }: CareTeamProps) {
  const [loading, setLoading] = useState(true)
  const [team, setTeam] = useState<Awaited<ReturnType<typeof getCareTeamDetailsForClient>> | null>(
    null,
  )

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    getCareTeamDetailsForClient(clientId)
      .then((details) => {
        if (!cancelled) setTeam(details)
      })
      .catch(() => {
        if (!cancelled) setTeam(null)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [clientId])

  type Member = { fullName: string; externalCode: string } | null
  const rows: { label: string; member: Member }[] = [
    { label: "BCBA", member: team?.bcba ?? null },
    { label: "Clinical supervisor", member: team?.supervisor ?? null },
    { label: "Behavior technician", member: team?.bt ?? null },
  ]

  return (
    <div className="mt-6 pt-6" style={{ borderTop: `1px solid ${P.rule}` }}>
      <p className={SECTION_LABEL} style={{ color: P.faint }}>
        Care team
      </p>

      {loading ? (
        <p className="mt-3 text-[15px] animate-pulse" style={{ color: P.faint }}>
          Loading…
        </p>
      ) : (
        <dl className="mt-3 space-y-3">
          {rows.map(({ label, member }) => (
            <div key={label} className="flex items-center justify-between gap-3 text-[15px]">
              <dt style={{ color: P.soft }}>{label}</dt>
              <dd className="text-right">
                <CareTeamValue
                  label={label}
                  member={member}
                  legacyStaffName={legacyStaffName}
                  hasAssignments={team?.hasAssignments ?? false}
                />
              </dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  )
}

function CareTeamValue({
  label,
  member,
  legacyStaffName,
  hasAssignments,
}: {
  label: string
  member: { fullName: string; externalCode: string } | null
  legacyStaffName?: string
  hasAssignments: boolean
}) {
  if (member) {
    return (
      <Link
        to={staffProfilePath(member.externalCode)}
        className="hover:underline underline-offset-2"
        style={{ color: P.ink }}
      >
        {member.fullName}
      </Link>
    )
  }

  const isBt = label === "Behavior technician"
  if (isBt && !hasAssignments && legacyStaffName) {
    return <span style={{ color: P.soft }}>{legacyStaffName}</span>
  }

  return <UnassignedPill />
}

function UnassignedPill() {
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[12px] font-medium"
      style={{ backgroundColor: P.amberBg, color: P.amberInk }}
    >
      <AlertCircle className="size-3 shrink-0" aria-hidden="true" />
      Unassigned
    </span>
  )
}
