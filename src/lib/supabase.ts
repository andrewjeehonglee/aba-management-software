import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Shape returned by getUserPractice. Keeping it flat for now — the nested
// practices join requires an explicit FK declaration in PostgREST; we'll
// add the practice name once we confirm the base flow works end-to-end.
export interface PracticeMembership {
  practice_id: string
  role: string
}

// Returns the membership row for the signed-in user, or null if they don't
// belong to any practice yet. maybeSingle() returns null (not an error) when
// 0 rows are found, which is safer than single() for the "new user" case.
export interface Client {
  id: string
  first_name: string
  last_name: string
  date_of_birth: string | null
  status: string | null
}

export async function getClients(): Promise<Client[]> {
  const { data, error } = await supabase
    .from('clients')
    .select('id, first_name, last_name, date_of_birth, status')
    .order('last_name', { ascending: true })
  if (error) throw error
  return data as Client[]
}

interface StaffRow {
  id: string
  full_name: string
  role: string
  team: string
  hire_date: string
  certification: string
  direct_hours: number
  indirect_hours: number
  cancellation_hours: number
}

export interface StaffRecord {
  id: string
  name: string
  role: string
  team: string
  hireDate: string
  certification: string
  directHours: number
  indirectHours: number
  cancellationHours: number
  totalHours: number
}

export async function getStaff(): Promise<StaffRecord[]> {
  const { data, error } = await supabase
    .from('staff')
    .select('id, full_name, role, team, hire_date, certification, direct_hours, indirect_hours, cancellation_hours')
    .order('full_name', { ascending: true })
  if (error) throw error
  return (data as StaffRow[]).map((row) => ({
    id: row.id,
    name: row.full_name,
    role: row.role,
    team: row.team,
    hireDate: row.hire_date,
    certification: row.certification,
    directHours: row.direct_hours,
    indirectHours: row.indirect_hours,
    cancellationHours: row.cancellation_hours,
    totalHours: row.direct_hours + row.indirect_hours + row.cancellation_hours,
  }))
}

interface SessionRow {
  id: string
  scheduled_at: string
  session_type: string
  status: string
  clients: { first_name: string; last_name: string }
  staff: { full_name: string; team: string }
}

export interface SessionRecord {
  id: string
  time: string
  clientName: string
  staffName: string
  staffTeam: string
  sessionType: string
  status: string
}

export async function getSessionsToday(): Promise<SessionRecord[]> {
  // Build UTC boundaries for the user's local "today"
  const now   = new Date()
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()
  const end   = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).toISOString()

  const { data, error } = await supabase
    .from('sessions')
    .select('id, scheduled_at, session_type, status, clients(first_name, last_name), staff(full_name, team)')
    .gte('scheduled_at', start)
    .lt('scheduled_at', end)
    .order('scheduled_at', { ascending: true })
  if (error) throw error

  return (data as SessionRow[]).map((row) => ({
    id:          row.id,
    time:        row.scheduled_at,
    clientName:  `${row.clients.first_name} ${row.clients.last_name}`,
    staffName:   row.staff.full_name,
    staffTeam:   row.staff.team,
    sessionType: row.session_type,
    status:      row.status,
  }))
}

export async function getUserPractice(userId: string): Promise<PracticeMembership | null> {
  console.log('[getUserPractice] querying practice_members for', userId)

  // Race the Supabase query against a 8-second timeout so the app never hangs
  // silently if RLS blocks the SELECT (query stalls rather than erroring).
  // .limit(1) ensures maybeSingle() never errors on duplicate rows
  // (which can occur if the user clicked "Create Practice" multiple times).
  const queryPromise = supabase
    .from('practice_members')
    .select('practice_id, role')
    .eq('user_id', userId)
    .limit(1)
    .maybeSingle()

  const timeoutPromise = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error('getUserPractice timed out after 8 s — check SELECT policy on practice_members')), 8000)
  )

  try {
    const { data, error } = await Promise.race([queryPromise, timeoutPromise])
    if (error) {
      console.error('[getUserPractice] Supabase error:', error)
      return null
    }
    console.log('[getUserPractice] result:', data)
    return data as PracticeMembership | null
  } catch (err) {
    console.error('[getUserPractice] caught:', err)
    return null
  }
}
