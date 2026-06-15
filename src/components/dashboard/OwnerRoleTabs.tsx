import { cn } from "@/lib/utils"

type Role = "Technician" | "Supervisor" | "BCBA" | "Owner"

const ROLES: Role[] = ["Owner", "BCBA", "Supervisor", "Technician"]

export function OwnerRoleTabs({
  viewRole,
  onViewRoleChange,
  className,
}: {
  viewRole: Role
  onViewRoleChange: (role: Role) => void
  className?: string
}) {
  return (
    <div
      className={cn(
        "inline-flex shrink-0 items-center gap-0.5 rounded-full border border-line bg-surface-2 p-1 shadow-card",
        className,
      )}
      role="tablist"
      aria-label="View as role"
    >
      {ROLES.map((r) => {
        const active = viewRole === r
        return (
          <button
            key={r}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onViewRoleChange(r)}
            className={cn(
              "rounded-full px-3 py-1.5 text-[12px] font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand",
              active
                ? "bg-surface text-brand shadow-card"
                : "text-muted hover:text-ink-soft",
            )}
          >
            {r}
          </button>
        )
      })}
    </div>
  )
}
