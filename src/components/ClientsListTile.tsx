import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { getClients, type Client } from "@/lib/supabase"

const STATUS_STYLES: Record<string, string> = {
  active:     "bg-green-100 text-green-800",
  inactive:   "bg-amber-100 text-amber-800",
  discharged: "bg-gray-100 text-gray-600",
}

function StatusBadge({ status }: { status: string | null }) {
  const label = status ?? "unknown"
  const cls = STATUS_STYLES[label.toLowerCase()] ?? "bg-gray-100 text-gray-500"
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${cls}`}>
      {label}
    </span>
  )
}

function formatDOB(dob: string | null): string {
  if (!dob) return "—"
  const d = new Date(dob)
  return isNaN(d.getTime()) ? dob : d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
}

export function ClientsListTile() {
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    getClients()
      .then(setClients)
      .catch((err: unknown) => setError(err instanceof Error ? err.message : "Failed to load clients"))
      .finally(() => setLoading(false))
  }, [])

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold">Clients</CardTitle>
      </CardHeader>
      <CardContent>
        {loading && (
          <p className="text-sm text-muted-foreground animate-pulse">Loading clients…</p>
        )}

        {!loading && error && (
          <p className="text-sm text-red-600 font-medium">{error}</p>
        )}

        {!loading && !error && clients.length === 0 && (
          <p className="text-sm text-muted-foreground">No clients yet.</p>
        )}

        {!loading && !error && clients.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted-foreground">
                  <th className="pb-2 pr-6 font-medium">Name</th>
                  <th className="pb-2 pr-6 font-medium">Date of Birth</th>
                  <th className="pb-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {clients.map(c => (
                  <tr key={c.id} className="hover:bg-muted/40 transition-colors">
                    <td className="py-2.5 pr-6 font-medium">
                      {c.last_name}, {c.first_name}
                    </td>
                    <td className="py-2.5 pr-6 text-muted-foreground">
                      {formatDOB(c.date_of_birth)}
                    </td>
                    <td className="py-2.5">
                      <StatusBadge status={c.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
