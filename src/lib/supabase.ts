import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Shape returned by getUserPractice — the join collapses the practices row
// into a nested object so callers get everything in one round-trip.
export interface PracticeMembership {
  practice_id: string
  role: string
  practices: {
    id: string
    name: string
  }
}

// Returns the practice (and role) the signed-in user belongs to, or null if
// they haven't been added to any practice yet. .single() returns null data
// (not a throw) when no row matches, so the null-check in App.tsx is safe.
export async function getUserPractice(userId: string): Promise<PracticeMembership | null> {
  const { data } = await supabase
    .from('practice_members')
    .select('practice_id, role, practices(id, name)')
    .eq('user_id', userId)
    .single()
  return data as PracticeMembership | null
}
