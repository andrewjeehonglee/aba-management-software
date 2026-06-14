import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  getBcbaCaseloadOverview,
  type BcbaCaseloadOverview,
} from "@/lib/rosterTable"
import { clientProfilePath, staffProfilePath } from "@/lib/rosterScope"

function StaffChip({ name, code }: { name: string; code: string }) {
  return (
    <Link
      to={staffProfilePath(code)}
      className="inline-flex rounded-md border border-border bg-surface px-2.5 py-1 text-sm hover:border-brand/40 hover:bg-brand-weak transition-colors"
    >
      {name}
    </Link>
  )
}

export function BcbaCaseloadPanel({
  practiceId,
  bcbaStaffId,
  bcbaName,
}: {
  practiceId: string
  bcbaStaffId: string
  bcbaName?: string
}) {
  const [overview, setOverview] = useState<BcbaCaseloadOverview | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    getBcbaCaseloadOverview(practiceId, bcbaStaffId)
      .then(setOverview)
      .catch(() => setOverview(null))
      .finally(() => setLoading(false))
  }, [practiceId, bcbaStaffId])

  if (loading) {
    return (
      <Card className="w-full">
        <CardContent className="py-8 text-sm text-muted-foreground animate-pulse text-center">
          Loading caseload…
        </CardContent>
      </Card>
    )
  }

  if (!overview || overview.clients.length === 0) {
    return (
      <Card className="w-full">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">
            {bcbaName ? `${bcbaName}'s caseload` : "BCBA caseload"}
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          No roster clients assigned to this BCBA yet. Re-run{" "}
          <code className="text-xs bg-muted px-1 rounded">npm run import:roster -- --all</code>.
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">
          {bcbaName ? `${bcbaName}'s caseload` : "BCBA caseload"}
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          {overview.clients.length} client{overview.clients.length === 1 ? "" : "s"}
          {" · "}
          {overview.supervisors.length} supervisor{overview.supervisors.length === 1 ? "" : "s"}
          {" · "}
          {overview.technicians.length} BT{overview.technicians.length === 1 ? "" : "s"}
        </p>
      </CardHeader>
      <CardContent className="space-y-5">
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-2">Clinical supervisors</p>
          <div className="flex flex-wrap gap-2">
            {overview.supervisors.map((s) => (
              <StaffChip key={s.staffId} name={s.fullName} code={s.externalCode} />
            ))}
          </div>
        </div>

        <div>
          <p className="text-xs font-medium text-muted-foreground mb-2">Behavior technicians</p>
          <div className="flex flex-wrap gap-2">
            {overview.technicians.map((s) => (
              <StaffChip key={s.staffId} name={s.fullName} code={s.externalCode} />
            ))}
          </div>
        </div>

        <div>
          <p className="text-xs font-medium text-muted-foreground mb-2">Clients</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {overview.clients.map((c) => (
              <Link
                key={c.clientId}
                to={clientProfilePath(c.clientCode)}
                className="rounded-md border border-border bg-surface px-3 py-2 text-sm font-semibold hover:border-brand/40 hover:bg-brand-weak transition-colors text-center"
              >
                {c.clientCode}
              </Link>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
