import { useEffect, useMemo, useRef, useState } from "react"
import { Search, X } from "lucide-react"
import {
  auditClientLabel,
  clientMatchesSearch,
  type AuditClientEntry,
} from "@/lib/auditClients"
import { P, SECTION_LABEL } from "@/pages/ClientOverviewPage/profileTokens"

interface ClientSearchSelectProps {
  clients: AuditClientEntry[]
  value: string
  onChange: (clientId: string) => void
  disabled?: boolean
}

export function ClientSearchSelect({
  clients,
  value,
  onChange,
  disabled = false,
}: ClientSearchSelectProps) {
  const [query, setQuery] = useState("")
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  const selected = clients.find((client) => client.id === value) ?? null

  useEffect(() => {
    if (selected) {
      setQuery(auditClientLabel(selected))
    }
  }, [selected?.id])

  const filtered = useMemo(
    () => clients.filter((client) => clientMatchesSearch(client, query)),
    [clients, query],
  )

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", handlePointerDown)
    return () => document.removeEventListener("mousedown", handlePointerDown)
  }, [])

  function selectClient(client: AuditClientEntry) {
    onChange(client.id)
    setQuery(auditClientLabel(client))
    setOpen(false)
  }

  return (
    <div ref={rootRef} className="relative">
      <label htmlFor="audit-client-search" className={`block ${SECTION_LABEL} mb-1.5`} style={{ color: P.faint }}>
        Client
      </label>
      <div className="relative">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2"
          style={{ color: P.faint }}
          aria-hidden
        />
        <input
          id="audit-client-search"
          type="search"
          value={query}
          disabled={disabled}
          onChange={(e) => {
            setQuery(e.target.value)
            setOpen(true)
          }}
          onFocus={() => setOpen(true)}
          placeholder="Search by client name…"
          className="w-full rounded-[12px] py-2.5 pl-9 pr-9 text-[15px] outline-none"
          style={{
            backgroundColor: P.inset,
            color: P.ink,
            boxShadow: `inset 0 0 0 1px ${P.rule}`,
          }}
          autoComplete="off"
        />
        {query && !disabled && (
          <button
            type="button"
            onClick={() => {
              setQuery("")
              onChange("")
              setOpen(true)
            }}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1.5 transition-opacity hover:opacity-80"
            style={{ color: P.faint }}
            aria-label="Clear client search"
          >
            <X className="size-4" />
          </button>
        )}
      </div>

      {open && !disabled && filtered.length > 0 && (
        <ul
          className="absolute z-20 mt-2 max-h-60 w-full overflow-y-auto rounded-[14px] py-1 shadow-lg"
          style={{ backgroundColor: P.card, boxShadow: `0 8px 24px rgba(44, 41, 36, 0.12), inset 0 0 0 1px ${P.rule}` }}
          role="listbox"
        >
          {filtered.map((client) => {
            const active = client.id === value
            return (
              <li key={client.id} role="option" aria-selected={active}>
                <button
                  type="button"
                  className="flex w-full px-3 py-2.5 text-left text-[15px] transition-colors hover:opacity-90"
                  style={{
                    backgroundColor: active ? P.sageBg : undefined,
                    color: active ? P.sageInk : P.ink,
                  }}
                  onClick={() => selectClient(client)}
                >
                  {auditClientLabel(client)}
                </button>
              </li>
            )
          })}
        </ul>
      )}

      {open && !disabled && query && filtered.length === 0 && (
        <p
          className="absolute z-20 mt-2 w-full rounded-[14px] px-3 py-2.5 text-[14px]"
          style={{ backgroundColor: P.card, color: P.soft, boxShadow: `inset 0 0 0 1px ${P.rule}` }}
        >
          No clients match &ldquo;{query}&rdquo;
        </p>
      )}
    </div>
  )
}
