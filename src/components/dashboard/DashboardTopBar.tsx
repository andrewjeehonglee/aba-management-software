import { Link } from "react-router-dom"
import { ClipboardList, Users } from "lucide-react"
import { Button } from "@/components/ui/button"
import { supabase } from "@/lib/supabase"
import { markUserSignOut } from "@/lib/authDiagnostics"

type Role = "Technician" | "Supervisor" | "BCBA" | "Owner"

const ROLES: Role[] = ["Owner", "BCBA", "Supervisor", "Technician"]

export function DashboardTopBar({
  practiceName,
  role,
  viewRole,
  onViewRoleChange,
  isDemo,
}: {
  practiceName?: string | null
  role: Role
  viewRole: Role
  onViewRoleChange: (role: Role) => void
  isDemo?: boolean
}) {
  return (
    <header
      className={`sticky top-0 z-10 flex h-14 w-full items-center justify-between gap-4 border-b border-border bg-surface px-4 sm:px-6 ${
        isDemo ? "bg-warn-bg/40" : ""
      }`}
    >
      <div className="flex min-w-0 items-center gap-4">
        <span className="shrink-0 text-[15px] font-semibold tracking-tight text-brand">
          Pulse
        </span>
        {practiceName && (
          <span className="hidden truncate text-sm text-muted sm:block">{practiceName}</span>
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
              <Users className="size-4" />
            </Link>
            <Link
              to="/audit"
              aria-label="Audit pull"
              title="Audit pull"
              className="inline-flex items-center justify-center rounded-control p-2 text-brand transition-colors hover:bg-brand-weak"
            >
              <ClipboardList className="size-4" />
            </Link>
          </>
        )}

        {role === "Owner" ? (
          <div className="hidden items-center gap-px rounded-full border border-border bg-bg p-0.5 sm:flex">
            {ROLES.map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => onViewRoleChange(r)}
                className={`rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
                  viewRole === r
                    ? "bg-surface text-brand shadow-card"
                    : "text-muted hover:text-ink"
                }`}
              >
                {r}
              </button>
            ))}
          </div>
        ) : (
          <span className="hidden items-center rounded-full bg-brand-weak px-2.5 py-1 text-xs font-medium text-brand sm:inline-flex">
            {role}
          </span>
        )}

        <Button
          variant="ghost"
          size="sm"
          className="text-muted hover:text-ink"
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
