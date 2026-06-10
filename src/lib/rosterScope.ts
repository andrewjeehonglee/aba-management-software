import { supabase } from "@/lib/supabase"

export async function getRosterStaffIds(practiceId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from("staff")
    .select("id")
    .eq("practice_id", practiceId)
    .not("external_code", "is", null)

  if (error) throw error
  return ((data ?? []) as { id: string }[]).map((row) => row.id)
}

/** Imported roster BTs/RBTs — owner notes/hours tiles (excludes BCBA/supervisor admin). */
export async function getRosterTechnicianStaffIds(practiceId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from("staff")
    .select("id")
    .eq("practice_id", practiceId)
    .eq("role", "technician")
    .not("external_code", "is", null)

  if (error) throw error
  return ((data ?? []) as { id: string }[]).map((row) => row.id)
}

export async function getRosterClientIds(practiceId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from("clients")
    .select("id")
    .eq("practice_id", practiceId)
    .eq("status", "active")
    .not("external_code", "is", null)

  if (error) throw error
  return ((data ?? []) as { id: string }[]).map((row) => row.id)
}
