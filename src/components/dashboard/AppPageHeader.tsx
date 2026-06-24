import type { ReactNode } from "react"

/** Shared page title + subtitle for OwnerAppShell pages (Clients, Staff, Sessions, Audit). */
export function AppPageHeader({
  title,
  subtitle,
  actions,
  children,
}: {
  title: string
  subtitle?: ReactNode
  actions?: ReactNode
  children?: ReactNode
}) {
  return (
    <header className="mb-5 shrink-0 short:mb-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-[clamp(1.75rem,3vw,2.25rem)] font-semibold tracking-[-0.02em] text-ink">
            {title}
          </h1>
          {subtitle != null && subtitle !== "" && (
            <p className="mt-1.5 text-[16px] leading-snug text-muted">{subtitle}</p>
          )}
        </div>
        {actions ? (
          <div className="flex shrink-0 flex-col items-end gap-1.5">{actions}</div>
        ) : null}
      </div>
      {children}
    </header>
  )
}
