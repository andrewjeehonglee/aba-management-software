import { useState } from "react"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"

interface Props {
  userId: string
  onPracticeCreated: () => void
}

export function CreatePracticePage({ userId, onPracticeCreated }: Props) {
  const [practiceName, setPracticeName] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleCreate() {
    const trimmed = practiceName.trim()
    if (!trimmed) return

    setLoading(true)
    setError(null)

    // Step 1 — create the practice record.
    const { data: practice, error: practiceError } = await supabase
      .from("practices")
      .insert({ name: trimmed })
      .select("id")
      .single()

    if (practiceError || !practice) {
      setError(practiceError?.message ?? "Failed to create practice.")
      setLoading(false)
      return
    }

    // Step 2 — link the current user as owner.
    const { error: memberError } = await supabase
      .from("practice_members")
      .insert({ practice_id: practice.id, user_id: userId, role: "owner" })

    if (memberError) {
      setError(memberError.message)
      setLoading(false)
      return
    }

    // Tell App.tsx to re-check — it will fetch the new membership and
    // swap in the dashboard without any client-side navigation.
    onPracticeCreated()
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && practiceName.trim()) handleCreate()
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
              <label className="text-sm font-medium" htmlFor="practice-name">
                Practice name
              </label>
              <Input
                id="practice-name"
                type="text"
                value={practiceName}
                onChange={e => setPracticeName(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="e.g. Bright Futures ABA"
                autoFocus
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
              disabled={loading || !practiceName.trim()}
            >
              {loading ? "Creating…" : "Create Practice"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
