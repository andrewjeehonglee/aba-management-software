import { Search } from "lucide-react"
import { cn } from "@/lib/utils"
import type {
  SessionsClientEntry,
  SessionsPerson,
  SessionsStaffGroup,
} from "@/lib/sessionsPageScope"
import { P } from "@/pages/ClientOverviewPage/profileTokens"

export type PanelTab = "clients" | "staff"

interface SessionsPeoplePanelProps {
  tab: PanelTab
  onTabChange: (tab: PanelTab) => void
  searchQuery: string
  onSearchChange: (query: string) => void
  clients: SessionsClientEntry[]
  staffGroups: SessionsStaffGroup[]
  selected: SessionsPerson | null
  onSelect: (person: SessionsPerson) => void
}

function isSelected(selected: SessionsPerson | null, kind: SessionsPerson["kind"], id: string) {
  return selected?.kind === kind && selected.id === id
}

function ClientRowButton({
  client,
  selected,
  onSelect,
}: {
  client: SessionsClientEntry
  selected: SessionsPerson | null
  onSelect: (person: SessionsPerson) => void
}) {
  const active = isSelected(selected, "client", client.id)
  return (
    <li>
      <button
        type="button"
        onClick={() =>
          onSelect({
            kind: "client",
            id: client.id,
            label: client.code,
            code: client.code,
          })
        }
        className={cn(
          "w-full rounded-[10px] px-3 py-2 text-left transition-colors",
          active ? "font-semibold" : "hover:opacity-90",
        )}
        style={{
          backgroundColor: active ? P.sageBg : "transparent",
          color: active ? P.sageInk : P.ink,
          boxShadow: active ? `inset 0 0 0 1px ${P.sage}` : undefined,
        }}
      >
        <span className="block text-[15px]">{client.code}</span>
      </button>
    </li>
  )
}

function StaffRoleHeader({ label }: { label: string }) {
  return (
    <div
      className="mb-1 rounded-[8px] px-2.5 py-1.5 text-[11px] font-bold uppercase tracking-[0.1em]"
      style={{ backgroundColor: P.inset, color: P.soft }}
    >
      {label}
    </div>
  )
}

export function SessionsPeoplePanel({
  tab,
  onTabChange,
  searchQuery,
  onSearchChange,
  clients,
  staffGroups,
  selected,
  onSelect,
}: SessionsPeoplePanelProps) {
  return (
    <aside
      className="flex min-h-0 w-full shrink-0 flex-col lg:w-[300px]"
      style={{ backgroundColor: P.card, borderRadius: P.radius }}
    >
      <div className="shrink-0 space-y-3 border-b p-4" style={{ borderColor: P.rule }}>
        <label className="relative block">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2"
            style={{ color: P.faint }}
            aria-hidden
          />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search clients or staff…"
            className="w-full rounded-[12px] py-2 pl-9 pr-3 text-[15px] outline-none"
            style={{
              backgroundColor: P.inset,
              color: P.ink,
              boxShadow: `inset 0 0 0 1px ${P.rule}`,
            }}
          />
        </label>

        <div
          className="inline-flex w-full items-center gap-0.5 rounded-full p-1"
          style={{ backgroundColor: P.inset }}
          role="tablist"
          aria-label="People list"
        >
          {(
            [
              { id: "clients" as const, label: "Clients" },
              { id: "staff" as const, label: "Staff" },
            ] as const
          ).map(({ id, label }) => {
            const active = tab === id
            return (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => onTabChange(id)}
                className={cn(
                  "flex-1 rounded-full px-3 py-1.5 text-[13px] font-semibold transition-colors",
                  active ? "shadow-sm" : "hover:opacity-80",
                )}
                style={{
                  backgroundColor: active ? P.card : "transparent",
                  color: active ? P.sageInk : P.soft,
                }}
              >
                {label}
              </button>
            )
          })}
        </div>
      </div>

      <div className="profile-scroll min-h-0 flex-1 overflow-y-auto p-3">
        {tab === "clients" ? (
          clients.length === 0 ? (
            <p className="px-2 py-6 text-center text-[15px]" style={{ color: P.soft }}>
              {searchQuery.trim() ? "No clients match your search." : "No clients in your scope."}
            </p>
          ) : (
            <ul className="space-y-0.5">
              {clients.map((client) => (
                <ClientRowButton
                  key={client.id}
                  client={client}
                  selected={selected}
                  onSelect={onSelect}
                />
              ))}
            </ul>
          )
        ) : staffGroups.length === 0 ? (
          <p className="px-2 py-6 text-center text-[15px]" style={{ color: P.soft }}>
            No staff in your scope.
          </p>
        ) : (
          <div className="space-y-4">
            {staffGroups.map((group) => (
              <section key={group.role}>
                <StaffRoleHeader label={group.roleLabel} />
                <ul className="space-y-0.5">
                  {group.members.map((member) => {
                    const active = isSelected(selected, "staff", member.id)
                    return (
                      <li key={member.id}>
                        <button
                          type="button"
                          onClick={() =>
                            onSelect({
                              kind: "staff",
                              id: member.id,
                              label: member.fullName,
                              code: member.externalCode,
                            })
                          }
                          className={cn(
                            "w-full rounded-[10px] px-3 py-2 text-left transition-colors",
                            active ? "font-semibold" : "hover:opacity-90",
                          )}
                          style={{
                            backgroundColor: active ? P.sageBg : "transparent",
                            color: active ? P.sageInk : P.ink,
                            boxShadow: active ? `inset 0 0 0 1px ${P.sage}` : undefined,
                          }}
                        >
                          <span className="block text-[15px] font-normal">{member.fullName}</span>
                        </button>
                      </li>
                    )
                  })}
                </ul>
              </section>
            ))}
          </div>
        )}
      </div>
    </aside>
  )
}
