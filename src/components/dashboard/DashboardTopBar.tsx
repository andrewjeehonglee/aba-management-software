import { Link } from "react-router-dom"
import { ClipboardList, Users } from "lucide-react"
import { Button } from "@/components/ui/button"
import { supabase } from "@/lib/supabase"
import { markUserSignOut } from "@/lib/authDiagnostics"
import { ownerInitials, OWNER_PERSONA_NAME } from "@/lib/ownerDashboardStatus"

type Role = "Technician" | "Supervisor" | "BCBA" | "Owner"

const ROLES: Role[] = ["Owner", "BCBA", "Supervisor", "Technician"]

export function DashboardTopBar({
  practiceName,
  role,
  viewRole,
  onViewRoleChange,
  isDemo,
  ownerName,
}: {
  practiceName?: string | null
  role: Role
  viewRole: Role
  onViewRoleChange: (role: Role) => void
  isDemo?: boolean
  ownerName?: string | null
}) {
  const displayPractice =
    practiceName && isDemo && !/\(demo\)/i.test(practiceName)
      ? `${practiceName} (demo)`
      : practiceName

  const accountName = ownerName?.trim() || OWNER_PERSONA_NAME
  const initials = ownerInitials(accountName)

  return (
    <header
      className="sticky top-0 z-10 flex h-14 shrink-0 w-full items-center justify-between gap-6 border-b border-line bg-surface px-5 sm:px-6"
    >
      <div className="flex min-w-0 items-center gap-4">
        <span className="shrink-0 text-lg font-semibold tracking-tight text-brand">
          Pulse
        </span>
        {displayPractice && (
          <span className="hidden truncate text-sm font-medium text-ink sm:block">
            {displayPractice}
          </span>
        )}
      </div>

      <div className="flex shrink-0 items-center gap-2 sm:gap-3">
        {role === "Owner" && (
          <>
            <Link
              to="/roster"
              aria-label="Caseload roster"
              title="Caseload roster"
              className="inline-flex items-center justify-center rounded-control p-2 text-brand transition-colors hover:bg-brand-weak"
            >
              <Users className="size-[18px]" />
            </Link>
            <Link
              to="/audit"
              aria-label="Audit pull"
              title="Audit pull"
              className="inline-flex items-center justify-center rounded-control p-2 text-brand transition-colors hover:bg-brand-weak"
            >
              <ClipboardList className="size-[18px]" />
            </Link>
          </>
        )}

        {isDemo && role === "Owner" ? (
          <div className="hidden items-center gap-0.5 rounded-full border border-line bg-bg p-0.5 sm:flex">
            {ROLES.map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => onViewRoleChange(r)}
                className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                  viewRole === r
                    ? "bg-surface text-brand shadow-card"
                    : "text-muted hover:text-ink"
                }`}
              >
                {r}
              </button>
            ))}
          </div>
        ) : role !== "Owner" ? (
          <span className="hidden items-center rounded-full bg-brand-weak px-3 py-1 text-xs font-medium text-brand sm:inline-flex">
            {role}
          </span>
        ) : null}

        <div className="hidden items-center gap-2 sm:flex">
          <span
            className="flex size-8 items-center justify-center rounded-full bg-brand-weak text-xs font-semibold text-brand"
            aria-hidden
          >
            {initials}
          </span>
          <span className="max-w-[120px] truncate text-sm font-medium text-ink">{accountName}</span>
        </div>

        <Button
          variant="ghost"
          size="sm"
          className="text-sm text-muted hover:text-ink"
          onClick={() => {
            markUserSignOut()
            void supabase.auth.signOut()
          }}
        >
          Sign out
        </Button>
      </div>
    </header>
  )
}
