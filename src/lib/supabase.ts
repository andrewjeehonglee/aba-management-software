import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    // Persist the session to localStorage and refresh the access token in the
    // background before it expires. Without these, the JWT silently expires on
    // a timer and the next auth event delivers a null session, logging the
    // user out mid-use.
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storage: typeof window !== 'undefined' ? window.localStorage : undefined,
  },
})

// Normalise DB team values to the "Team X" format used by the dashboard
// filters. The DB seeds store bare letters ('A', 'B', 'C'); the UI expects
// "Team A" / "Team B" / "Team C". Already-normalised values pass through.
function teamLabel(raw: string | null | undefined): string {
  if (!raw) return ''
  return raw.startsWith('Team') ? raw : `Team ${raw}`
}

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

export interface NewClient {
  practiceId:   string
  firstName:    string
  lastName:     string
  dateOfBirth:  string
  insurance?:   string
  team:         string
  status:       string
}

export async function createNewClient(client: NewClient): Promise<void> {
  const { error } = await supabase
    .from('clients')
    .insert({
      practice_id:   client.practiceId,
      first_name:    client.firstName,
      last_name:     client.lastName,
      date_of_birth: client.dateOfBirth,
      insurance:     client.insurance ?? null,
      team:          client.team,
      status:        client.status,
    })
  if (error) throw error
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

export interface NewStaff {
  practiceId:         string
  name:               string
  role:               string
  team:               string
  directHours?:       number
  indirectHours?:     number
  cancellationHours?: number
}

export async function createStaff(staff: NewStaff): Promise<void> {
  const { error } = await supabase
    .from('staff')
    .insert({
      practice_id:        staff.practiceId,
      full_name:          staff.name,
      role:               staff.role,
      team:               staff.team,
      direct_hours:       staff.directHours       ?? 0,
      indirect_hours:     staff.indirectHours     ?? 0,
      cancellation_hours: staff.cancellationHours ?? 0,
    })
  if (error) throw error
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
    team: teamLabel(row.team),
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
  client_id: string
  clients: { first_name: string; last_name: string }
  staff: { full_name: string; team: string }
}

export interface SessionRecord {
  id: string
  time: string
  clientId: string
  clientName: string
  staffName: string
  staffTeam: string
  sessionType: string
  status: string
}

export async function getStaffByUserId(userId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from('staff')
    .select('id')
    .eq('user_id', userId)
    .maybeSingle()
  if (error) throw error
  return data ? (data as { id: string }).id : null
}

function mapSessionRows(data: SessionRow[]): SessionRecord[] {
  return data.map((row) => ({
    id:          row.id,
    time:        row.scheduled_at,
    clientId:    row.client_id,
    clientName:  `${row.clients.first_name} ${row.clients.last_name}`,
    staffName:   row.staff.full_name,
    staffTeam:   teamLabel(row.staff.team),
    sessionType: row.session_type,
    status:      row.status,
  }))
}

async function querySessionsInRange(start: string, end: string, staffId?: string): Promise<SessionRecord[]> {
  let query = supabase
    .from('sessions')
    .select('id, scheduled_at, session_type, status, client_id, clients(first_name, last_name), staff(full_name, team)')
    .gte('scheduled_at', start)
    .lt('scheduled_at', end)
    .order('scheduled_at', { ascending: true })

  if (staffId) query = query.eq('staff_id', staffId)

  const { data, error } = await query
  if (error) throw error
  return mapSessionRows(data as unknown as SessionRow[])
}

export async function getSessionsToday(staffId?: string, demoFallback = false): Promise<SessionRecord[]> {
  const now   = new Date()
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()
  const end   = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).toISOString()

  console.log('[getSessionsToday] UTC boundaries:', start, '→', end, '| staffId filter:', staffId ?? 'none')

  const today = await querySessionsInRange(start, end, staffId)
  const DEMO_MIN_SESSIONS = 8 // seeded "today" slate has 14 rows across 11 staff

  if (!demoFallback) {
    console.log('[getSessionsToday] rows returned:', today.length)
    return today
  }
  if (today.length >= DEMO_MIN_SESSIONS) {
    console.log('[getSessionsToday] demo rows (calendar today):', today.length)
    return today
  }

  // Demo: calendar today empty or sparse (e.g. one ad-hoc session) — use the anchor day instead.
  let latestQuery = supabase
    .from('sessions')
    .select('scheduled_at')
    .order('scheduled_at', { ascending: false })
    .limit(1)
  if (staffId) latestQuery = latestQuery.eq('staff_id', staffId)

  const { data: latestRow, error: latestErr } = await latestQuery.maybeSingle()
  if (latestErr) throw latestErr
  if (!latestRow) return []

  const anchor = new Date((latestRow as { scheduled_at: string }).scheduled_at)
  const fallbackStart = new Date(anchor.getFullYear(), anchor.getMonth(), anchor.getDate()).toISOString()
  const fallbackEnd   = new Date(anchor.getFullYear(), anchor.getMonth(), anchor.getDate() + 1).toISOString()
  console.log('[getSessionsToday] demo fallback range:', fallbackStart, '→', fallbackEnd)

  const fallback = await querySessionsInRange(fallbackStart, fallbackEnd, staffId)
  console.log('[getSessionsToday] demo fallback rows:', fallback.length)
  return fallback
}

export async function getSessionsByClientId(clientId: string): Promise<SessionRecord[]> {
  const { data, error } = await supabase
    .from('sessions')
    .select('id, scheduled_at, session_type, status, client_id, clients(first_name, last_name), staff(full_name, team)')
    .eq('client_id', clientId)
    .order('scheduled_at', { ascending: true })
  if (error) throw error

  return (data as unknown as SessionRow[]).map((row) => ({
    id:          row.id,
    time:        row.scheduled_at,
    clientId:    row.client_id,
    clientName:  `${row.clients.first_name} ${row.clients.last_name}`,
    staffName:   row.staff.full_name,
    staffTeam:   teamLabel(row.staff.team),
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
  client_id: string
  used_units: number
  authorized_units: number
  cpt_code: string
  start_date: string
  end_date: string
  clients: { first_name: string; last_name: string; team: string }
}

export interface AuthRecord {
  id: string
  clientId: string
  clientName: string
  clientTeam: string
  utilizationPct: number
  totalAuthorizedHours: number
  cptCode: string
  startDate: string
  endDate: string
}

export interface NewAuthorization {
  practiceId:           string
  clientId:             string
  totalAuthorizedHours: number
  authStartDate:        string
  authEndDate:          string
  cptCodes:             string[]
}

export async function createAuthorization(auth: NewAuthorization): Promise<void> {
  const { error } = await supabase
    .from('authorizations')
    .insert({
      practice_id:      auth.practiceId,
      client_id:        auth.clientId,
      authorized_units: auth.totalAuthorizedHours,
      used_units:       0,
      cpt_code:         auth.cptCodes.join(", "),
      start_date:       auth.authStartDate,
      end_date:         auth.authEndDate,
    })
  if (error) throw error
}

export async function updateAuthorization(id: string, auth: Partial<NewAuthorization>): Promise<void> {
  const patch: Record<string, unknown> = {}
  if (auth.totalAuthorizedHours !== undefined) patch.authorized_units = auth.totalAuthorizedHours
  if (auth.authStartDate        !== undefined) patch.start_date       = auth.authStartDate
  if (auth.authEndDate          !== undefined) patch.end_date         = auth.authEndDate
  if (auth.cptCodes             !== undefined) patch.cpt_code         = auth.cptCodes.join(", ")
  const { error } = await supabase
    .from('authorizations')
    .update(patch)
    .eq('id', id)
  if (error) throw error
}

export async function getAuthorizations(): Promise<AuthRecord[]> {
  const { data, error } = await supabase
    .from('authorizations')
    .select('id, client_id, used_units, authorized_units, cpt_code, start_date, end_date, clients(first_name, last_name, team)')
    .order('used_units', { ascending: false })
  if (error) throw error

  return (data as unknown as AuthRow[]).map((row) => ({
    id:                  row.id,
    clientId:            row.client_id,
    clientName:          `${row.clients.first_name} ${row.clients.last_name}`,
    clientTeam:          teamLabel(row.clients.team),
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
    clientId:             clientId,
    clientName:           `${row.clients.first_name} ${row.clients.last_name}`,
    clientTeam:           teamLabel(row.clients.team),
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
    staffTeam:     teamLabel(row.staff.team),
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
    staffTeam:      teamLabel(row.staff.team),
    supervisionPct: row.supervision_pct,
    periodStart:    row.period_start,
    periodEnd:      row.period_end,
  }
}

export async function getSessionsByStaffId(staffId: string): Promise<SessionRecord[]> {
  const { data, error } = await supabase
    .from('sessions')
    .select('id, scheduled_at, session_type, status, client_id, clients(first_name, last_name), staff(full_name, team)')
    .eq('staff_id', staffId)
    .order('scheduled_at', { ascending: true })
  if (error) throw error

  return (data as unknown as SessionRow[]).map((row) => ({
    id:          row.id,
    time:        row.scheduled_at,
    clientId:    row.client_id,
    clientName:  `${row.clients.first_name} ${row.clients.last_name}`,
    staffName:   row.staff.full_name,
    staffTeam:   teamLabel(row.staff.team),
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
    staffTeam:    teamLabel(row.staff.team),
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

export interface NewGoal {
  practiceId:      string
  clientId:        string
  name:            string
  masteryCriteria: string
  domain:          string
  status:          string
}

export async function createGoal(goal: NewGoal): Promise<void> {
  const { error } = await supabase
    .from('goals')
    .insert({
      practice_id:           goal.practiceId,
      client_id:             goal.clientId,
      name:                  goal.name,
      mastery_criteria:      goal.masteryCriteria,
      domain:                goal.domain,
      status:                goal.status,
      streak_days:           0,
      streak_percent:        0,
      last_updated_days_ago: 0,
    })
  if (error) throw error
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

export interface NewBehavior {
  practiceId:   string
  clientId:     string
  name:         string
  description?: string
}

export async function createBehavior(behavior: NewBehavior): Promise<void> {
  const { error } = await supabase
    .from('behaviors')
    .insert({
      practice_id:  behavior.practiceId,
      client_id:    behavior.clientId,
      name:         behavior.name.trim(),
      description:  behavior.description?.trim() || null,
    })
  if (error) throw error
}

export interface SessionNote {
  practiceId:  string
  sessionId:   string
  clientId:    string
  staffId:     string
  subjective:  string
  objective:   string
  assessment:  string
  plan:        string
}

export interface SessionNoteRecord {
  id:         string
  session_id: string
  staff_id:   string
  subjective: string
  objective:  string
  assessment: string
  plan:       string
  created_at: string | null
  session_at: string | null
}

export interface BehaviorIncidentRecord {
  id:               string
  session_id:       string
  behavior_id:      string
  antecedents:      string[] | null
  consequences:     string[] | null
  intensity:        string | null
  duration_seconds: number | null
  created_at:       string | null
  session_at:       string | null
  behaviors:        { name: string } | null
}

type NoteRow = {
  id: string
  session_id: string
  staff_id: string
  subjective: string
  objective: string
  assessment: string
  plan: string
  created_at: string | null
  sessions: { scheduled_at: string } | null
}

type IncidentRow = {
  id: string
  session_id: string
  behavior_id: string
  antecedents: string[] | null
  consequences: string[] | null
  intensity: string | null
  duration_seconds: number | null
  created_at: string | null
  behaviors: { name: string } | null
  sessions: { scheduled_at: string } | null
}

export async function getBehaviorIncidentsByClientId(clientId: string): Promise<BehaviorIncidentRecord[]> {
  const { data, error } = await supabase
    .from('behavior_incidents')
    .select('id, session_id, behavior_id, antecedents, consequences, intensity, duration_seconds, created_at, behaviors(name), sessions(scheduled_at)')
    .eq('client_id', clientId)
    .order('id', { ascending: false })
  if (error) throw error
  return ((data ?? []) as unknown as IncidentRow[]).map((row) => ({
    id:               row.id,
    session_id:       row.session_id,
    behavior_id:      row.behavior_id,
    antecedents:      row.antecedents,
    consequences:     row.consequences,
    intensity:        row.intensity,
    duration_seconds: row.duration_seconds,
    created_at:       row.created_at,
    session_at:       row.sessions?.scheduled_at ?? null,
    behaviors:        row.behaviors,
  }))
}

export async function getSessionNotesByClientId(clientId: string): Promise<SessionNoteRecord[]> {
  const { data, error } = await supabase
    .from('session_notes')
    .select('id, session_id, staff_id, subjective, objective, assessment, plan, created_at, sessions(scheduled_at)')
    .eq('client_id', clientId)
    .order('id', { ascending: false })
  if (error) throw error
  return ((data ?? []) as unknown as NoteRow[]).map((row) => ({
    id:         row.id,
    session_id: row.session_id,
    staff_id:   row.staff_id,
    subjective: row.subjective,
    objective:  row.objective,
    assessment: row.assessment,
    plan:       row.plan,
    created_at: row.created_at,
    session_at: row.sessions?.scheduled_at ?? null,
  }))
}

export interface NewSession {
  practiceId:  string
  clientId:    string
  staffId:     string
  sessionType: string
}

export async function createSession(session: NewSession): Promise<string> {
  const { data, error } = await supabase
    .from('sessions')
    .insert({
      practice_id:  session.practiceId,
      client_id:    session.clientId,
      staff_id:     session.staffId,
      session_type: session.sessionType,
      status:       'scheduled',
      scheduled_at: new Date().toISOString(),
    })
    .select('id')
    .single()
  if (error) throw error
  return (data as { id: string }).id
}

export interface BehaviorIncident {
  practiceId:      string
  sessionId:       string
  clientId:        string
  behaviorId:      string
  antecedents?:    string[]
  consequences?:   string[]
  intensity?:      string
  durationSeconds?: number
}

export async function saveBehaviorIncident(incident: BehaviorIncident): Promise<void> {
  const { error } = await supabase
    .from('behavior_incidents')
    .insert({
      practice_id:      incident.practiceId,
      session_id:       incident.sessionId,
      client_id:        incident.clientId,
      behavior_id:      incident.behaviorId,
      antecedents:      incident.antecedents,
      consequences:     incident.consequences,
      intensity:        incident.intensity,
      duration_seconds: incident.durationSeconds,
    })
  if (error) console.error('[saveBehaviorIncident]', error)
}

export async function submitSessionNote(note: SessionNote): Promise<void> {
  const { error } = await supabase
    .from('session_notes')
    .insert({
      practice_id: note.practiceId,
      session_id:  note.sessionId,
      client_id:   note.clientId,
      staff_id:    note.staffId,
      subjective:  note.subjective,
      objective:   note.objective,
      assessment:  note.assessment,
      plan:        note.plan,
    })
  if (error) console.error('[submitSessionNote]', error)
}

export async function completeSession(sessionId: string): Promise<void> {
  const { error } = await supabase
    .from('sessions')
    .update({ status: 'completed' })
    .eq('id', sessionId)
  if (error) console.error('[completeSession]', error)
}

export async function updateGoalStatus(goalId: string, status: string, masteryCriteria?: string): Promise<void> {
  const patch: Record<string, unknown> = { status }
  if (masteryCriteria !== undefined) patch.mastery_criteria = masteryCriteria
  const { error } = await supabase
    .from('goals')
    .update(patch)
    .eq('id', goalId)
  if (error) console.error('[updateGoalStatus]', error)
}

export interface TrialResult {
  sessionId:   string
  goalId:      string
  practiceId:  string
  trialNumber: number
  response:    'correct' | 'incorrect' | 'no_response' | 'prompted'
}

export async function saveTrialResult(trial: TrialResult): Promise<void> {
  const { error } = await supabase
    .from('session_trials')
    .insert({
      session_id:   trial.sessionId,
      goal_id:      trial.goalId,
      practice_id:  trial.practiceId,
      trial_number: trial.trialNumber,
      response:     trial.response,
    })
  if (error) console.error('[saveTrialResult]', error)
}

export async function getUserRole(userId: string, practiceId: string): Promise<string> {
  const { data, error } = await supabase
    .from('practice_members')
    .select('role')
    .eq('user_id', userId)
    .eq('practice_id', practiceId)
    .single()
  if (error) throw error
  if (!data) throw new Error('No membership row found')
  return (data as { role: string }).role
}

export async function joinPractice(userId: string, joinCode: string, displayName: string, role: string = 'technician'): Promise<void> {
  const cleaned = joinCode.trim().toLowerCase()
  if (!cleaned) throw new Error('Please enter a join code.')

  const { data: practice, error: lookupError } = await supabase
    .from('practices')
    .select('id')
    .like('id', `${cleaned}%`)
    .maybeSingle()

  // A query/RLS error means we couldn't verify the code — surface it as an
  // operational failure, NOT as "no practice with that code".
  if (lookupError) {
    console.error('[joinPractice] practice lookup failed:', lookupError)
    throw new PracticeLookupError('Could not verify that join code right now. Please try again.', lookupError)
  }
  // Query succeeded with zero rows — the code genuinely matches no practice.
  if (!practice) throw new Error('No practice found with that code. Check with your supervisor.')

  const { error: memberError } = await supabase
    .from('practice_members')
    .insert({ practice_id: practice.id, user_id: userId, role: role.toLowerCase() })

  if (memberError) throw memberError

  const { error: staffError } = await supabase
    .from('staff')
    .insert({
      practice_id:        practice.id,
      user_id:            userId,
      full_name:          displayName.trim(),
      role:               'Technician',
      team:               'Team A',
      direct_hours:       0,
      indirect_hours:     0,
      cancellation_hours: 0,
    })

  if (staffError) throw staffError
}

// Thrown when a practice lookup fails for an operational reason (network
// error, RLS/SELECT error, or timeout) — i.e. we could NOT determine whether
// the user has a practice. This is deliberately distinct from a successful
// query that simply returns zero rows ("no practice yet"), which is a normal
// state represented by a null return value rather than an error.
export class PracticeLookupError extends Error {
  readonly cause?: unknown
  constructor(message: string, cause?: unknown) {
    super(message)
    this.name = 'PracticeLookupError'
    this.cause = cause
  }
}

// Resolves to the membership row, or null ONLY when the query genuinely
// succeeds and finds zero rows. On any query error or timeout it throws a
// PracticeLookupError instead of returning null, so callers can tell
// "no practice" apart from "couldn't check".
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
    setTimeout(
      () => reject(new PracticeLookupError('Timed out loading your practice. Check your connection and try again. (SELECT policy on practice_members may also be blocking the query.)')),
      8000,
    )
  )

  let result: Awaited<typeof queryPromise>
  try {
    result = await Promise.race([queryPromise, timeoutPromise])
  } catch (err) {
    // Timeout or an unexpected throw (e.g. network failure). NOT "no practice".
    console.error('[getUserPractice] lookup failed:', err)
    if (err instanceof PracticeLookupError) throw err
    throw new PracticeLookupError('Could not load your practice. Please try again.', err)
  }

  const { data, error } = result
  if (error) {
    // A real query / RLS error — surface it rather than masquerading as
    // "no practice", which would wrongly drop the user onto onboarding.
    console.error('[getUserPractice] Supabase error:', error)
    throw new PracticeLookupError('Could not load your practice. Please try again.', error)
  }

  // Genuine success: the membership row, or null when zero rows matched.
  console.log('[getUserPractice] result:', data)
  return (data as PracticeMembership | null) ?? null
}

// ─── Adoption Health Stats ────────────────────────────────────────────────────

export interface AdoptionHealthStats {
  activeStaffThisWeek: number
  totalStaff: number
  completionRate: number
  totalSessionsThisWeek: number
}

export async function getAdoptionHealthStats(): Promise<AdoptionHealthStats> {
  const now = new Date()
  const weekStart = new Date(now)
  weekStart.setDate(now.getDate() - now.getDay())
  weekStart.setHours(0, 0, 0, 0)

  const [sessionsResp, staffResp] = await Promise.all([
    supabase
      .from('sessions')
      .select('staff_id, status')
      .gte('scheduled_at', weekStart.toISOString()),
    supabase
      .from('staff')
      .select('id', { count: 'exact', head: true }),
  ])

  if (sessionsResp.error) throw sessionsResp.error
  if (staffResp.error) throw staffResp.error

  const sessions = (sessionsResp.data ?? []) as { staff_id: string; status: string }[]
  const totalStaff = staffResp.count ?? 0

  const activeStaffIds = new Set(sessions.map(s => s.staff_id))
  const completed = sessions.filter(s => s.status === 'completed').length
  const countable = sessions.filter(s => s.status !== 'cancelled' && s.status !== 'no-show').length
  const completionRate = countable > 0 ? Math.round((completed / countable) * 100) : 0

  return {
    activeStaffThisWeek: activeStaffIds.size,
    totalStaff,
    completionRate,
    totalSessionsThisWeek: sessions.length,
  }
}

// ─── Practice Hero Stats (last 14 days + this-week summary) ──────────────────

export interface DailySessionCount {
  date: string  // 'YYYY-MM-DD'
  count: number
}

export interface PracticeHeroStats {
  sessionsThisWeek: number
  completionRate: number
  staffOnTrack: number
  activeClients: number
  dailySessions: DailySessionCount[]
}

export async function getSessionsLast14Days(): Promise<DailySessionCount[]> {
  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 13)

  const { data, error } = await supabase
    .from('sessions')
    .select('scheduled_at')
    .gte('scheduled_at', start.toISOString())
    .order('scheduled_at', { ascending: true })

  if (error) throw error

  // Pre-fill all 14 days with 0 so the chart has a continuous x-axis
  const counts: Record<string, number> = {}
  for (let i = 0; i < 14; i++) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 13 + i)
    counts[d.toISOString().split('T')[0]] = 0
  }
  for (const row of (data ?? []) as { scheduled_at: string }[]) {
    const key = row.scheduled_at.split('T')[0]
    if (key in counts) counts[key] = (counts[key] ?? 0) + 1
  }
  return Object.entries(counts).map(([date, count]) => ({ date, count }))
}

export async function getPracticeHeroStats(): Promise<PracticeHeroStats> {
  const [adoptionStats, dailySessions, clientResp] = await Promise.all([
    getAdoptionHealthStats(),
    getSessionsLast14Days(),
    supabase.from('clients').select('*', { count: 'exact', head: true }).eq('status', 'active'),
  ])

  if (clientResp.error) throw clientResp.error

  return {
    sessionsThisWeek: adoptionStats.totalSessionsThisWeek,
    completionRate:   adoptionStats.completionRate,
    staffOnTrack:     adoptionStats.activeStaffThisWeek,
    activeClients:    clientResp.count ?? 0,
    dailySessions,
  }
}
