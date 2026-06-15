import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { resolveOwnerDisplayName } from "@/lib/ownerDashboardStatus"

export function useOwnerShell(practiceId: string, userRole?: string) {
  const [practiceName, setPracticeName] = useState<string | null>(null)
  const [ownerDisplayName, setOwnerDisplayName] = useState<string | null>(null)

  useEffect(() => {
    void supabase
      .from("practices")
      .select("name")
      .eq("id", practiceId)
      .maybeSingle()
      .then(
        ({ data }) => setPracticeName((data as { name: string } | null)?.name ?? null),
        () => setPracticeName(null),
      )
  }, [practiceId])

  useEffect(() => {
    void supabase.auth.getSession().then(({ data: { session } }) => {
      const metaName = session?.user?.user_metadata?.full_name as string | undefined
      if (metaName?.trim()) {
        setOwnerDisplayName((prev) => prev ?? metaName.trim())
      }
    })
  }, [])

  const ownerName = resolveOwnerDisplayName(userRole, ownerDisplayName)

  return { practiceName, ownerName }
}
