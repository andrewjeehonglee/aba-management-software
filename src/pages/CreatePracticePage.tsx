import { useState } from "react"
import { joinPractice, supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface Props {
  userId: string
  onPracticeCreated: () => void
}

export function CreatePracticePage({ userId, onPracticeCreated }: Props) {
  const [ownerName, setOwnerName]     = useState("")
  const [practiceName, setPracticeName] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const [joinCode, setJoinCode] = useState("")
  const [joinDisplayName, setJoinDisplayName] = useState("")
  const [joinRole, setJoinRole] = useState("Technician")
  const [joinError, setJoinError] = useState<string | null>(null)
  const [joinLoading, setJoinLoading] = useState(false)

  async function handleJoin() {
    setJoinError(null)
    setJoinLoading(true)
    try {
      await joinPractice(userId, joinCode, joinDisplayName.trim(), joinRole)
      onPracticeCreated()
    } catch (err) {
      setJoinError(err instanceof Error ? err.message : "Failed to join practice.")
    } finally {
      setJoinLoading(false)
    }
  }

  async function handleCreate() {
    const trimmedName     = ownerName.trim()
    const trimmedPractice = practiceName.trim()
    if (!trimmedName || !trimmedPractice) return

    setLoading(true)
    setError(null)

    // Step 1 — create the practice record.
    const { data: practice, error: practiceError } = await supabase
      .from("practices")
      .insert({ name: trimmedPractice })
      .select("id")
      .single()

    if (practiceError || !practice) {
      console.error("[CreatePractice] practices insert failed:", practiceError)
      setError(practiceError?.message || practiceError?.code || "Failed to create practice — check the browser console for details.")
      setLoading(false)
      return
    }

    // Step 2 — link the current user as owner.
    const { error: memberError } = await supabase
      .from("practice_members")
      .insert({ practice_id: practice.id, user_id: userId, role: "owner" })

    if (memberError) {
      console.error("[CreatePractice] practice_members insert failed:", memberError)
      setError(memberError.message || memberError.code || "Failed to add you to the practice — check the browser console for details.")
      setLoading(false)
      return
    }

    // Step 3 — create a staff row for the owner so session attribution works.
    const { error: staffError } = await supabase
      .from("staff")
      .insert({
        practice_id: practice.id,
        user_id:     userId,
        full_name:   trimmedName,
        role:        "BCBA",
        team:        "Team A",
        hours_direct: 0,
        hours_supervision: 0,
        hours_total:       0,
      })

    if (staffError) {
      console.error("[CreatePractice] staff insert failed:", staffError)
      // Non-fatal — the practice and member rows are already created. Log and continue.
    }

    setLoading(false)
    onPracticeCreated()
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && ownerName.trim() && practiceName.trim()) handleCreate()
  }

  return (
    <div className="min-h-svh bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Welcome</h1>
          <p className="text-sm text-muted-foreground">
            You're not part of a practice yet. Create one to get started.
          </p>
        </div>

        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-base">Create your practice</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium" htmlFor="owner-name">
                Your name <span className="text-red-500">*</span>
              </label>
              <Input
                id="owner-name"
                type="text"
                value={ownerName}
                onChange={e => setOwnerName(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="e.g. Dr. Sarah Kim"
                autoFocus
                disabled={loading}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium" htmlFor="practice-name">
                Practice name <span className="text-red-500">*</span>
              </label>
              <Input
                id="practice-name"
                type="text"
                value={practiceName}
                onChange={e => setPracticeName(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="e.g. Bright Futures ABA"
                disabled={loading}
              />
            </div>

            {error && (
              <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 border border-red-200">
                {error}
              </p>
            )}

            <Button
              className="w-full"
              onClick={handleCreate}
              disabled={loading || !ownerName.trim() || !practiceName.trim()}
            >
              {loading ? "Creating…" : "Create Practice"}
            </Button>
          </CardContent>
        </Card>

        {/* Divider */}
        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-border" />
          <span className="text-xs text-muted-foreground">or join an existing practice</span>
          <div className="flex-1 h-px bg-border" />
        </div>

        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-base">Join a practice</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium" htmlFor="join-display-name">
                Your name <span className="text-red-500">*</span>
              </label>
              <Input
                id="join-display-name"
                type="text"
                value={joinDisplayName}
                onChange={e => setJoinDisplayName(e.target.value)}
                placeholder="e.g. Maria Gonzalez"
                disabled={joinLoading}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium" htmlFor="join-role">
                Your role
              </label>
              <Select value={joinRole} onValueChange={setJoinRole} disabled={joinLoading}>
                <SelectTrigger id="join-role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Owner">Owner</SelectItem>
                  <SelectItem value="BCBA">BCBA</SelectItem>
                  <SelectItem value="Supervisor">Supervisor</SelectItem>
                  <SelectItem value="Technician">Technician</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium" htmlFor="join-code">
                Join code <span className="text-red-500">*</span>
              </label>
              <Input
                id="join-code"
                type="text"
                value={joinCode}
                onChange={e => setJoinCode(e.target.value.slice(0, 8))}
                onKeyDown={e => {
                  if (e.key === "Enter" && joinCode.trim().length >= 6 && joinDisplayName.trim()) handleJoin()
                }}
                placeholder="8-character code from your supervisor"
                disabled={joinLoading}
                className="font-mono tracking-widest uppercase"
              />
              <p className="text-xs text-muted-foreground">
                Ask your practice owner for the code from their dashboard.
              </p>
            </div>

            {joinError && (
              <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 border border-red-200">
                {joinError}
              </p>
            )}

            <Button
              variant="outline"
              className="w-full"
              onClick={handleJoin}
              disabled={joinLoading || joinCode.trim().length < 6 || !joinDisplayName.trim()}
            >
              {joinLoading ? "Joining…" : "Join Practice"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
