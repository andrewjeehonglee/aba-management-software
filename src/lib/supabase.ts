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

export interface ClientDetail {
  id: string
  first_name: string
  last_name: string
  date_of_birth: string | null
  status: string | null
  team: string | null
  insurance: string | null
  auth_start_date: string | null
  auth_end_date: string | null
  cpt_codes: string[] | null
  assigned_staff: { full_name: string } | null
}

export async function getClientById(id: string): Promise<ClientDetail | null> {
  const { data, error } = await supabase
    .from('clients')
    .select('id, first_name, last_name, date_of_birth, status, team, insurance, auth_start_date, auth_end_date, cpt_codes, staff(full_name)')
    .eq('id', id)
    .maybeSingle()
  if (error) throw error
  if (!data) return null
  const row = data as unknown as Omit<ClientDetail, 'assigned_staff'> & { staff: { full_name: string } | null }
  return { ...row, assigned_staff: row.staff }
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

  return (data as unknown as SessionRow[]).map((row) => ({
    id:          row.id,
    time:        row.scheduled_at,
    clientName:  `${row.clients.first_name} ${row.clients.last_name}`,
    staffName:   row.staff.full_name,
    staffTeam:   row.staff.team,
    sessionType: row.session_type,
    status:      row.status,
  }))
}

export async function getSessionsByClientId(clientId: string): Promise<SessionRecord[]> {
  const { data, error } = await supabase
    .from('sessions')
    .select('id, scheduled_at, session_type, status, clients(first_name, last_name), staff(full_name, team)')
    .eq('client_id', clientId)
    .order('scheduled_at', { ascending: true })
  if (error) throw error

  return (data as unknown as SessionRow[]).map((row) => ({
    id:          row.id,
    time:        row.scheduled_at,
    clientName:  `${row.clients.first_name} ${row.clients.last_name}`,
    staffName:   row.staff.full_name,
    staffTeam:   row.staff.team,
    sessionType: row.session_type,
    status:      row.status,
  }))
}

interface SessionByIdRow {
  id: string
  client_id: string
  staff_id: string
  session_type: string
  scheduled_at: string
  status: string
  clients: { first_name: string; last_name: string }
  staff: { full_name: string }
}

export interface SessionDetail {
  id: string
  clientId: string
  staffId: string
  sessionType: string
  scheduledAt: string
  status: string
  clientName: string
  staffName: string
}

export async function getSessionById(sessionId: string): Promise<SessionDetail | null> {
  const { data, error } = await supabase
    .from('sessions')
    .select('id, client_id, staff_id, session_type, scheduled_at, status, clients(first_name, last_name), staff(full_name)')
    .eq('id', sessionId)
    .maybeSingle()
  if (error) throw error
  if (!data) return null

  const row = data as unknown as SessionByIdRow
  return {
    id:           row.id,
    clientId:     row.client_id,
    staffId:      row.staff_id,
    sessionType:  row.session_type,
    scheduledAt:  row.scheduled_at,
    status:       row.status,
    clientName:   `${row.clients.first_name} ${row.clients.last_name}`,
    staffName:    row.staff.full_name,
  }
}

interface AuthRow {
  id: string
  used_units: number
  authorized_units: number
  cpt_code: string
  start_date: string
  end_date: string
  clients: { first_name: string; last_name: string; team: string }
}

export interface AuthRecord {
  id: string
  clientName: string
  clientTeam: string
  utilizationPct: number
  totalAuthorizedHours: number
  cptCode: string
  startDate: string
  endDate: string
}

export async function getAuthorizations(): Promise<AuthRecord[]> {
  const { data, error } = await supabase
    .from('authorizations')
    .select('id, used_units, authorized_units, cpt_code, start_date, end_date, clients(first_name, last_name, team)')
    .order('used_units', { ascending: false })
  if (error) throw error

  return (data as unknown as AuthRow[]).map((row) => ({
    id:                  row.id,
    clientName:          `${row.clients.first_name} ${row.clients.last_name}`,
    clientTeam:          row.clients.team,
    utilizationPct:      Math.round((row.used_units / row.authorized_units) * 100),
    totalAuthorizedHours: row.authorized_units,
    cptCode:             row.cpt_code,
    startDate:           row.start_date,
    endDate:             row.end_date,
  }))
}

export async function getAuthorizationsByClientId(clientId: string): Promise<AuthRecord | null> {
  const { data, error } = await supabase
    .from('authorizations')
    .select('id, used_units, authorized_units, cpt_code, start_date, end_date, clients(first_name, last_name, team)')
    .eq('client_id', clientId)
    .maybeSingle()
  if (error) throw error
  if (!data) return null

  const row = data as unknown as AuthRow
  return {
    id:                   row.id,
    clientName:           `${row.clients.first_name} ${row.clients.last_name}`,
    clientTeam:           row.clients.team,
    utilizationPct:       Math.round((row.used_units / row.authorized_units) * 100),
    totalAuthorizedHours: row.authorized_units,
    cptCode:              row.cpt_code,
    startDate:            row.start_date,
    endDate:              row.end_date,
  }
}

interface SupervisionRow {
  id: string
  supervision_pct: number
  period_start: string
  period_end: string
  staff: { full_name: string; team: string }
}

export interface SupervisionRecord {
  id: string
  staffName: string
  staffTeam: string
  supervisionPct: number
  periodStart: string
  periodEnd: string
}

export async function getSupervision(): Promise<SupervisionRecord[]> {
  const { data, error } = await supabase
    .from('supervision')
    .select('id, supervision_pct, period_start, period_end, staff(full_name, team)')
    .order('supervision_pct', { ascending: true })
  if (error) throw error

  return (data as unknown as SupervisionRow[]).map((row) => ({
    id:            row.id,
    staffName:     row.staff.full_name,
    staffTeam:     row.staff.team,
    supervisionPct: row.supervision_pct,
    periodStart:   row.period_start,
    periodEnd:     row.period_end,
  }))
}

export async function getSupervisionByStaffId(staffId: string): Promise<SupervisionRecord | null> {
  const { data, error } = await supabase
    .from('supervision')
    .select('id, supervision_pct, period_start, period_end, staff(full_name, team)')
    .eq('staff_id', staffId)
    .maybeSingle()
  if (error) throw error
  if (!data) return null

  const row = data as unknown as SupervisionRow
  return {
    id:             row.id,
    staffName:      row.staff.full_name,
    staffTeam:      row.staff.team,
    supervisionPct: row.supervision_pct,
    periodStart:    row.period_start,
    periodEnd:      row.period_end,
  }
}

export async function getSessionsByStaffId(staffId: string): Promise<SessionRecord[]> {
  const { data, error } = await supabase
    .from('sessions')
    .select('id, scheduled_at, session_type, status, clients(first_name, last_name), staff(full_name, team)')
    .eq('staff_id', staffId)
    .order('scheduled_at', { ascending: true })
  if (error) throw error

  return (data as unknown as SessionRow[]).map((row) => ({
    id:          row.id,
    time:        row.scheduled_at,
    clientName:  `${row.clients.first_name} ${row.clients.last_name}`,
    staffName:   row.staff.full_name,
    staffTeam:   row.staff.team,
    sessionType: row.session_type,
    status:      row.status,
  }))
}

interface OverdueNoteRow {
  id: string
  overdue_count: number
  as_of_date: string
  staff: { full_name: string; team: string }
}

export interface OverdueNoteRecord {
  id: string
  staffName: string
  staffTeam: string
  overdueCount: number
  asOfDate: string
}

export async function getOverdueNotes(): Promise<OverdueNoteRecord[]> {
  const { data, error } = await supabase
    .from('overdue_notes')
    .select('id, overdue_count, as_of_date, staff(full_name, team)')
    .order('overdue_count', { ascending: false })
  if (error) throw error

  return (data as unknown as OverdueNoteRow[]).map((row) => ({
    id:           row.id,
    staffName:    row.staff.full_name,
    staffTeam:    row.staff.team,
    overdueCount: row.overdue_count,
    asOfDate:     row.as_of_date,
  }))
}

interface GoalRowDB {
  id: string
  name: string
  mastery_criteria: string
  domain: string | null
  status: string
  streak_days: number
  streak_percent: number
  last_updated_days_ago: number
}

export interface GoalRecord {
  id: string
  name: string
  masteryTarget: string
  domain: string | null
  status: string
  streakDays: number
  streakPercent: number
  lastUpdatedDaysAgo: number
}

export async function getGoalsByClientId(clientId: string): Promise<GoalRecord[]> {
  const { data, error } = await supabase
    .from('goals')
    .select('id, name, mastery_criteria, domain, status, streak_days, streak_percent, last_updated_days_ago')
    .eq('client_id', clientId)
  if (error) throw error

  return (data as GoalRowDB[]).map((row) => ({
    id:                  row.id,
    name:                row.name,
    masteryTarget:       row.mastery_criteria,
    domain:              row.domain,
    status:              row.status,
    streakDays:          row.streak_days,
    streakPercent:       row.streak_percent,
    lastUpdatedDaysAgo:  row.last_updated_days_ago,
  }))
}

interface BehaviorRow {
  id: string
  name: string
  description: string | null
}

export interface BehaviorRecord {
  id: string
  name: string
  description: string | null
}

export async function getBehaviorsByClientId(clientId: string): Promise<BehaviorRecord[]> {
  const { data, error } = await supabase
    .from('behaviors')
    .select('id, name, description')
    .eq('client_id', clientId)
    .order('created_at', { ascending: true })
  if (error) throw error

  return (data as unknown as BehaviorRow[]).map((row) => ({
    id:          row.id,
    name:        row.name,
    description: row.description,
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
