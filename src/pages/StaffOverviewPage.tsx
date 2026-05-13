import { ArrowLeft } from "lucide-react"
import { Link, useParams } from "react-router-dom"
import { SessionStatusBadge } from "@/components/SessionStatusBadge"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { mockSessions } from "@/data/mockSessions"
import { mockStaff } from "@/data/mockStaff"
import { mockSupervision } from "@/data/mockSupervision"
import { formatTime } from "@/lib/sessions"
import { toSlug, unslug } from "@/lib/slug"
import {
  SUPERVISION_THRESHOLD,
  actualSupervisionHours,
  complianceClasses,
  complianceStatus,
  requiredHours,
  type ComplianceStatus,
} from "@/lib/supervision"
import type { Session } from "@/types/session"
import type { Staff } from "@/types/staff"
import type { RBTSupervision } from "@/types/supervision"

// Compliance status display config — color + label per status. Mirrors the
// shape of STATUS_CONFIG in src/lib/sessions.ts but for the supervision
// domain. Inlined here (rule of three: only one caller for now).
const COMPLIANCE_CONFIG: Record<
  ComplianceStatus,
  { label: string; className: string }
> = {
  compliant:       { label: "Compliant",     className: "bg-emerald-100 text-emerald-800" },
  "at-risk":       { label: "At risk",       className: "bg-amber-100 text-amber-800" },
  "non-compliant": { label: "Non-compliant", className: "bg-red-100 text-red-800" },
}

// Formal role title for the detail grid. The single-word enum value is fine
// in chips and short labels, but the formal "this is who they are on paper"
// reads better with the full credential name.
const ROLE_TITLE: Record<Staff["role"], string> = {
  BCBA:       "Board Certified Behavior Analyst (BCBA)",
  Supervisor: "Clinical Supervisor",
  Technician: "Behavior Technician (RBT)",
}

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
      {children}
    </span>
  )
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

// Pretty-print an ISO date "2023-08-15" as "Aug 15, 2023". The "T00:00:00"
// suffix forces local-midnight interpretation; without it, JS treats a bare
// "YYYY-MM-DD" as UTC-midnight and can shift the displayed day by one in
// negative-UTC-offset locales.
function formatDate(iso: string) {
  return new Date(iso + "T00:00:00").toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  })
}

// Derive the role this staff member is *acting* in this week from session
// types. Same priority logic as ClientOverviewPage: any BCBA-level session
// (Supervision, Assessment, or Parent training) outranks Direct therapy. A
// Technician who ran one Assessment under supervision will show as BCBA
// here while their formal role on the detail grid stays Technician — the
// mismatch surfaces a real-life moment ("did you see Tyler is doing his
// first BCBA assessment this week?") rather than hiding it.
function deriveStaffRoleFromSessions(
  staffName: string,
  sessions: Session[]
): "Supervisor / BCBA" | "Technician" | null {
  const theirSessions = sessions.filter((s) => s.staffName === staffName)
  if (theirSessions.length === 0) return null

  const hasBcbaSession = theirSessions.some(
    (s) =>
      s.sessionType === "Supervision" ||
      s.sessionType === "Assessment" ||
      s.sessionType === "Parent training"
  )
  return hasBcbaSession ? "Supervisor / BCBA" : "Technician"
}

export function StaffOverviewPage() {
  const { staffId } = useParams<{ staffId: string }>()

  // Slug-match on both sides — same canonical-form pattern used everywhere
  // else for client/staff lookups. Resolves cleanly even if names later
  // contain apostrophes, accents, or other punctuation.
  const staff = staffId
    ? mockStaff.find((s) => toSlug(s.name) === staffId)
    : undefined
  const supervision = staffId
    ? mockSupervision.find((r) => toSlug(r.rbtName) === staffId)
    : undefined
  const staffSessions = staffId
    ? mockSessions.filter((s) => toSlug(s.staffName) === staffId)
    : []

  const displayName =
    staff?.name
    ?? staffSessions[0]?.staffName
    ?? supervision?.rbtName
    ?? (staffId ? unslug(staffId) : "Unknown staff")

  const derivedRole = deriveStaffRoleFromSessions(displayName, mockSessions)

  // Header subtitle. Two distinct semantics encoded in one line:
  //   - With "· this week" suffix: what they're *doing* right now (derived
  //     from session types this week).
  //   - Without suffix: what they *are* on paper (formal role from staff
  //     record). Used when there's no session activity this week so the
  //     page header still anchors the visitor — "Technician" is more
  //     useful than a name floating in white space.
  const subtitle = derivedRole
    ? `${derivedRole} · this week`
    : staff?.role ?? null

  // Sessions worked this week, sorted chronologically. ISO timestamps sort
  // correctly under string compare.
  const sortedSessions = [...staffSessions].sort((a, b) =>
    a.time.localeCompare(b.time)
  )

  // Caseload — unique clients this staff member has sessions with this week.
  const caseload = Array.from(
    new Set(staffSessions.map((s) => s.clientName))
  )

  // "Off-week" condition — collapse the three otherwise-empty section cards
  // (supervision / sessions / caseload) into one explanatory notice when
  // the staff member has no signal at all in any of them. A cascade of
  // three near-identical "No X" cards reads as broken; a single notice
  // reads as intentional. The header card always renders — formal role,
  // certification, hire date, and team are still useful even with zero
  // activity (e.g. visitor came here from the cert-expiring tile).
  // Note: caseload is derived from sessions, so checking sessions covers
  // both. Supervision is independent (admin-tracked), so it gets its own
  // condition.
  const hasNoActivity = staffSessions.length === 0 && !supervision

  return (
    <div className="min-h-svh bg-background text-foreground flex flex-col items-center gap-6 p-4">
      <header className="flex w-full max-w-3xl items-center py-6">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="size-4" />
          Back to dashboard
        </Link>
      </header>

      {/* Section 1 — Staff header */}
      <Card className="w-full max-w-3xl">
        <CardHeader>
          <CardTitle className="text-3xl font-semibold tracking-tight">
            {displayName}
          </CardTitle>
          {subtitle && (
            <p className="text-sm text-muted-foreground">{subtitle}</p>
          )}
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <Chip>
              {staffSessions.length} session{staffSessions.length === 1 ? "" : "s"} this week
            </Chip>
            <Chip>
              {caseload.length} client{caseload.length === 1 ? "" : "s"} served
            </Chip>
          </div>

          {staff && <StaffDetailGrid staff={staff} />}
        </CardContent>
      </Card>

      {hasNoActivity ? (
        /* Collapsed empty state — one card explaining the situation
           instead of three cascading "No X" cards. Reads as intentional
           ("we know there's no activity, here's what would appear")
           rather than broken ("everything is missing"). */
        <Card className="w-full max-w-3xl">
          <CardContent className="py-12 text-center">
            <p className="text-sm text-muted-foreground">
              No session activity for {displayName} this week.
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              When sessions are scheduled, supervision compliance, sessions, and caseload will appear here.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Section 2 — Supervision compliance */}
          <Card className="w-full max-w-3xl">
            <CardHeader>
              <CardTitle>Supervision compliance</CardTitle>
            </CardHeader>
            <CardContent>
              {supervision && staff ? (
                <SupervisionDetail supervision={supervision} staff={staff} />
              ) : (
                <div className="rounded-md border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                  No supervision data available for this staff member.
                </div>
              )}
            </CardContent>
          </Card>

          {/* Section 3 — Sessions this week.
              "This week" is aspirational labeling; mock data is just today,
              same as ClientOverviewPage. Title reflects intended real-data
              scope, not the current fixture. */}
          <Card className="w-full max-w-3xl">
            <CardHeader>
              <CardTitle>Sessions this week</CardTitle>
            </CardHeader>
            <CardContent>
              {sortedSessions.length === 0 ? (
                <div className="rounded-md border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                  No sessions this week for this staff member.
                </div>
              ) : (
                <div className="grid grid-cols-[3.5rem_minmax(0,1fr)_8rem_6rem] items-center gap-x-3 gap-y-1 text-xs">
                  <div className="text-muted-foreground pb-2 border-b">Time</div>
                  <div className="text-muted-foreground pb-2 border-b">Client</div>
                  <div className="text-muted-foreground pb-2 border-b">Type</div>
                  <div className="text-muted-foreground pb-2 border-b text-right">
                    Status
                  </div>

                  {sortedSessions.map((s) => (
                    <div key={s.id} className="contents">
                      <div className="font-mono text-muted-foreground tabular-nums py-1.5">
                        {formatTime(s.time)}
                      </div>
                      <div className="truncate min-w-0 py-1.5 text-sm">
                        <Link
                          to={"/clients/" + toSlug(s.clientName)}
                          className="hover:underline underline-offset-2"
                        >
                          {s.clientName}
                        </Link>
                      </div>
                      <div className="truncate min-w-0 py-1.5 text-muted-foreground">
                        {s.sessionType}
                      </div>
                      <div className="flex items-center justify-end py-1.5">
                        <SessionStatusBadge status={s.status} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Section 4 — Client caseload */}
          <Card className="w-full max-w-3xl">
            <CardHeader>
              <CardTitle>Client caseload</CardTitle>
            </CardHeader>
            <CardContent>
              {caseload.length === 0 ? (
                <div className="rounded-md border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                  No clients on this staff member's caseload this week.
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {caseload.map((clientName) => (
                    <Link
                      key={clientName}
                      to={"/clients/" + toSlug(clientName)}
                      className="inline-flex items-center rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground hover:bg-muted/80 hover:text-foreground transition-colors"
                    >
                      {clientName}
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}

// 4-row label/value detail grid. Uses semantic <dl>/<dt>/<dd> for screen-
// reader-friendly definition list semantics. Same pattern as
// ClientDetailGrid in ClientOverviewPage.
function StaffDetailGrid({ staff }: { staff: Staff }) {
  return (
    <dl className="grid grid-cols-[max-content_1fr] gap-x-6 gap-y-2 border-t border-border pt-4 text-sm">
      <dt className="text-muted-foreground">Role title</dt>
      <dd>{ROLE_TITLE[staff.role]}</dd>

      <dt className="text-muted-foreground">Hire date</dt>
      <dd>{formatDate(staff.hireDate)}</dd>

      <dt className="text-muted-foreground">Certification</dt>
      <dd>{staff.certification}</dd>

      <dt className="text-muted-foreground">Assigned team</dt>
      <dd>{staff.team}</dd>
    </dl>
  )
}

// Expanded supervision visualization — bar + % + plain-English requirements
// line + status chip. Same shape as AuthorizationDetail on ClientOverviewPage;
// they're cousins (both detail-page expansions of a dashboard mini-bar) but
// kept separate because the threshold semantics are inverted (high % = good
// here, high % = bad there) and merging would obscure the difference.
function SupervisionDetail({
  supervision,
  staff,
}: {
  supervision: RBTSupervision
  staff: Staff
}) {
  const { bar, text } = complianceClasses(supervision.supervisionPct)
  const status = complianceStatus(supervision.supervisionPct)
  const actual = actualSupervisionHours(
    supervision.supervisionPct,
    staff.totalHours
  )
  const required = requiredHours(staff.totalHours)

  return (
    <div className="space-y-4">
      <div className="flex items-baseline justify-between gap-3">
        <span className={`text-3xl font-semibold tabular-nums ${text}`}>
          {supervision.supervisionPct.toFixed(1)}%
        </span>
        <ComplianceBadge status={status} />
      </div>

      {/* Expanded mini-bar — full content width with the 5% threshold marker
          line so the visual language matches the dashboard tile + the
          per-client auth bar. Bar fills to actual %, capped at 100%. */}
      <div className="relative h-3 w-full overflow-hidden rounded-full bg-slate-200">
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

      <p className="text-sm">
        <span className="font-medium tabular-nums">{actual}</span>
        <span className="text-muted-foreground"> of </span>
        <span className="font-medium tabular-nums">{required}</span>
        <span className="text-muted-foreground"> required supervision hours this period</span>
      </p>
    </div>
  )
}
