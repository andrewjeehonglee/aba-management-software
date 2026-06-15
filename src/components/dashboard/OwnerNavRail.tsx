import { Link, useLocation } from "react-router-dom"
import {
  CalendarDays,
  ClipboardList,
  LayoutDashboard,
  LogOut,
  UserCircle,
  Users,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { supabase } from "@/lib/supabase"
import { markUserSignOut } from "@/lib/authDiagnostics"
import { firstName, ownerInitials } from "@/lib/ownerDashboardStatus"

const NAV_ITEMS = [
  { label: "Dashboard", href: "/", icon: LayoutDashboard, match: (path: string) => path === "/" },
  { label: "Clients", href: "/roster", icon: Users, match: (path: string) => path === "/roster" || path.startsWith("/clients/") },
  { label: "Staff", href: "/roster", icon: UserCircle, match: (path: string) => path.startsWith("/staff/") },
  { label: "Sessions", href: "/roster", icon: CalendarDays, match: (path: string) => path.startsWith("/session/") },
  { label: "Audit", href: "/audit", icon: ClipboardList, match: (path: string) => path === "/audit" },
] as const

function PulseGlyph({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="20"
      height="12"
      viewBox="0 0 20 12"
      fill="none"
      aria-hidden
    >
      <path
        d="M1 6h3.5l1.5-4 2.5 8 2-5 1.5 1H19"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function NavLinkItem({
  label,
  href,
  icon: Icon,
  active,
}: {
  label: string
  href: string
  icon: typeof LayoutDashboard
  active: boolean
}) {
  return (
    <Link
      to={href}
      className={cn(
        "flex items-center gap-3 rounded-[12px] px-3 py-2 text-[15px] font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand",
        active
          ? "bg-surface text-ink shadow-card"
          : "text-ink-soft hover:bg-surface-2 hover:text-ink",
      )}
      aria-current={active ? "page" : undefined}
    >
      <Icon
        className={cn("size-[19px] shrink-0", active ? "text-brand" : "text-muted")}
        strokeWidth={1.75}
      />
      {label}
    </Link>
  )
}

export function OwnerNavRail({
  ownerName,
  practiceName,
}: {
  ownerName: string
  practiceName?: string | null
}) {
  const location = useLocation()
  const path = location.pathname
  const initials = ownerInitials(ownerName)
  const practiceLabel = practiceName?.trim() || "Your practice"

  async function handleSignOut() {
    markUserSignOut()
    await supabase.auth.signOut()
  }

  const accountBlock = (
    <div className="flex items-center gap-3 px-1">
      <span
        className="flex size-11 shrink-0 items-center justify-center rounded-full bg-accent-soft text-[15px] font-semibold text-brand"
        aria-hidden
      >
        {initials}
      </span>
      <div className="min-w-0">
        <p className="truncate text-[17px] font-semibold text-ink">{firstName(ownerName)}</p>
        <p className="truncate text-[14px] text-muted">{practiceLabel}</p>
      </div>
    </div>
  )

  return (
    <>
      {/* Desktop rail */}
      <aside className="hidden min-h-0 w-[236px] shrink-0 flex-col border-r border-line bg-bg px-3 py-6 min-[1000px]:flex">
        <div className="mb-8 flex items-center gap-2.5 px-2">
          <span className="text-xl font-semibold tracking-tight text-brand">Pulse</span>
          <PulseGlyph className="text-brand" />
        </div>

        <div className="mb-8">{accountBlock}</div>

        <nav className="space-y-0.5" aria-label="Main">
          {NAV_ITEMS.map((item) => (
            <NavLinkItem
              key={item.label}
              label={item.label}
              href={item.href}
              icon={item.icon}
              active={item.match(path)}
            />
          ))}
        </nav>

        <button
          type="button"
          onClick={() => void handleSignOut()}
          className="mt-auto flex w-full items-center gap-3 rounded-[12px] px-3 py-2.5 text-[15px] font-medium text-muted transition-colors hover:bg-surface-2 hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
        >
          <LogOut className="size-[19px] shrink-0" strokeWidth={1.75} />
          Sign out
        </button>
      </aside>

      {/* Mobile / tablet top bar */}
      <header className="flex min-h-0 shrink-0 items-center justify-between gap-3 border-b border-line bg-bg px-4 py-3 min-[1000px]:hidden">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-base font-semibold text-brand">Pulse</span>
            <PulseGlyph className="text-brand" />
          </div>
          <div className="hidden min-w-0 sm:block">
            <p className="truncate text-[15px] font-semibold text-ink">{firstName(ownerName)}</p>
            <p className="truncate text-[13px] text-muted">{practiceLabel}</p>
          </div>
        </div>
        <nav className="flex items-center gap-1 overflow-x-auto" aria-label="Main">
          {NAV_ITEMS.map((item) => {
            const active = item.match(path)
            const Icon = item.icon
            return (
              <Link
                key={item.label}
                to={item.href}
                className={cn(
                  "flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1.5 text-xs font-medium transition-colors",
                  active ? "bg-surface text-brand shadow-card" : "text-muted",
                )}
                aria-current={active ? "page" : undefined}
              >
                <Icon className="size-3.5" strokeWidth={1.75} />
                <span className="hidden sm:inline">{item.label}</span>
              </Link>
            )
          })}
        </nav>
        <button
          type="button"
          onClick={() => void handleSignOut()}
          className="shrink-0 rounded-full p-2 text-muted hover:text-ink"
          aria-label="Sign out"
        >
          <LogOut className="size-4" />
        </button>
      </header>
    </>
  )
}
