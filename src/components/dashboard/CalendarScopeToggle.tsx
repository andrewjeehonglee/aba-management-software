import { cn } from "@/lib/utils"

export type CalendarSessionScope = "self" | "team"

const DEFAULT_OPTIONS: { value: CalendarSessionScope; label: string }[] = [
  { value: "self", label: "My sessions" },
  { value: "team", label: "My team" },
]

export function CalendarScopeToggle({
  scope,
  onScopeChange,
  className,
  scopeLabels,
  "aria-label": ariaLabel = "Whose sessions to show",
}: {
  scope: CalendarSessionScope
  onScopeChange: (scope: CalendarSessionScope) => void
  className?: string
  scopeLabels?: { self: string; team: string }
  "aria-label"?: string
}) {
  const options = scopeLabels
    ? [
        { value: "self" as const, label: scopeLabels.self },
        { value: "team" as const, label: scopeLabels.team },
      ]
    : DEFAULT_OPTIONS

  return (
    <div
      className={cn(
        "inline-flex shrink-0 items-center gap-0.5 rounded-full border border-line bg-surface-2 p-1 shadow-card",
        className,
      )}
      role="tablist"
      aria-label={ariaLabel}
    >
      {options.map(({ value, label }) => {
        const active = scope === value
        return (
          <button
            key={value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onScopeChange(value)}
            className={cn(
              "rounded-full px-3 py-1.5 text-[12px] font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand",
              active
                ? "bg-surface text-brand shadow-card"
                : "text-muted hover:text-ink-soft",
            )}
          >
            {label}
          </button>
        )
      })}
    </div>
  )
}
