import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { Plus } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { createNewClient, getClients, type Client } from "@/lib/supabase"

// ─── Constants ────────────────────────────────────────────────────────────────

const TEAMS   = ["A", "B", "C"] as const
const STATUSES = ["active", "inactive", "discharged"] as const

const EMPTY_FORM = {
  firstName:   "",
  lastName:    "",
  dateOfBirth: "",
  insurance:   "",
  team:        "" as string,
  status:      "active",
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

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
  const d = new Date(dob + "T00:00:00")
  return isNaN(d.getTime()) ? dob : d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
}

// ─── New Client Modal ─────────────────────────────────────────────────────────

interface NewClientModalProps {
  open: boolean
  practiceId: string
  onClose: () => void
  onSuccess: () => void
}

function NewClientModal({ open, practiceId, onClose, onSuccess }: NewClientModalProps) {
  const [form, setForm] = useState(EMPTY_FORM)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  function reset() {
    setForm(EMPTY_FORM)
    setError(null)
    setLoading(false)
  }

  function handleOpenChange(next: boolean) {
    if (!next) { reset(); onClose() }
  }

  function set<K extends keyof typeof EMPTY_FORM>(key: K, value: string) {
    setForm(prev => ({ ...prev, [key]: value }))
  }

  const canSubmit =
    form.firstName.trim() &&
    form.lastName.trim() &&
    form.dateOfBirth &&
    form.team

  async function handleSubmit() {
    if (!canSubmit) return
    setError(null)
    setLoading(true)
    try {
      await createNewClient({
        practiceId,
        firstName:   form.firstName.trim(),
        lastName:    form.lastName.trim(),
        dateOfBirth: form.dateOfBirth,
        insurance:   form.insurance.trim() || undefined,
        team:        `Team ${form.team}`,
        status:      form.status,
      })
      reset()
      onSuccess()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create client.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New Client</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-1">
          {/* Name row */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">
                First name <span className="text-red-500">*</span>
              </label>
              <Input
                value={form.firstName}
                onChange={e => set("firstName", e.target.value)}
                placeholder="Jane"
                disabled={loading}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">
                Last name <span className="text-red-500">*</span>
              </label>
              <Input
                value={form.lastName}
                onChange={e => set("lastName", e.target.value)}
                placeholder="Smith"
                disabled={loading}
              />
            </div>
          </div>

          {/* Date of Birth */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">
              Date of birth <span className="text-red-500">*</span>
            </label>
            <Input
              type="date"
              value={form.dateOfBirth}
              onChange={e => set("dateOfBirth", e.target.value)}
              disabled={loading}
            />
          </div>

          {/* Insurance */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">
              Insurance <span className="text-muted-foreground font-normal">(optional)</span>
            </label>
            <Input
              value={form.insurance}
              onChange={e => set("insurance", e.target.value)}
              placeholder="e.g. Blue Cross"
              disabled={loading}
            />
          </div>

          {/* Team + Status row */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">
                Team <span className="text-red-500">*</span>
              </label>
              <Select value={form.team ?? ""} onValueChange={v => set("team", v ?? "")} disabled={loading}>
                <SelectTrigger>
                  <SelectValue placeholder="Select team" />
                </SelectTrigger>
                <SelectContent>
                  {TEAMS.map(t => (
                    <SelectItem key={t} value={t}>Team {t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Status</label>
              <Select value={form.status ?? ""} onValueChange={v => set("status", v ?? "")} disabled={loading}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUSES.map(s => (
                    <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {error && (
            <p className="rounded-md bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => { reset(); onClose() }}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleSubmit}
              disabled={!canSubmit || loading}
            >
              {loading ? "Saving…" : "Add Client"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ─── Tile ─────────────────────────────────────────────────────────────────────

interface ClientsListTileProps {
  refreshKey?:      number
  canAddClient?:    boolean
  practiceId?:      string
  isDemo?:          boolean
  onClientCreated?: () => void
}

export function ClientsListTile({ refreshKey, canAddClient, practiceId, isDemo, onClientCreated }: ClientsListTileProps) {
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [modalOpen, setModalOpen] = useState(false)

  useEffect(() => {
    setLoading(true)
    setError(null)
    getClients()
      .then(setClients)
      .catch((err: unknown) => setError(err instanceof Error ? err.message : "Failed to load clients"))
      .finally(() => setLoading(false))
  }, [refreshKey])

  function handleSuccess() {
    setModalOpen(false)
    onClientCreated?.()
  }

  return (
    <>
      <Card className="w-full">
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <CardTitle className="text-base font-semibold">Clients</CardTitle>
          {canAddClient && (
            <Button
              size="sm"
              variant="outline"
              className="h-7 px-2.5 text-xs gap-1"
              onClick={() => {
                if (isDemo) { toast.info("Create a free account to save data."); return }
                setModalOpen(true)
              }}
            >
              <Plus className="size-3.5" />
              New Client
            </Button>
          )}
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
                    <tr
                      key={c.id}
                      className="relative hover:bg-muted/40 transition-colors cursor-pointer"
                    >
                      <td className="py-2.5 pr-6 font-medium">
                        <Link
                          to={`/clients/${c.id}`}
                          className="block after:absolute after:inset-0"
                        >
                          {c.last_name}, {c.first_name}
                        </Link>
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

      {canAddClient && practiceId && (
        <NewClientModal
          open={modalOpen}
          practiceId={practiceId}
          onClose={() => setModalOpen(false)}
          onSuccess={handleSuccess}
        />
      )}
    </>
  )
}
