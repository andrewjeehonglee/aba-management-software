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

export async function getStaffByUserId(userId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from('staff')
    .select('id')
    .eq('user_id', userId)
    .maybeSingle()
  if (error) throw error
  return data ? (data as { id: string }).id : null
}

export async function getSessionsToday(staffId?: string): Promise<SessionRecord[]> {
  // Build UTC boundaries for the user's local "today"
  const now   = new Date()
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()
  const end   = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).toISOString()

  let query = supabase
    .from('sessions')
    .select('id, scheduled_at, session_type, status, clients(first_name, last_name), staff(full_name, team)')
    .gte('scheduled_at', start)
    .lt('scheduled_at', end)
    .order('scheduled_at', { ascending: true })

  if (staffId) query = query.eq('staff_id', staffId)

  const { data, error } = await query
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
  created_at: string
}

export interface BehaviorIncidentRecord {
  id:               string
  session_id:       string
  behavior_id:      string
  antecedents:      string[] | null
  consequences:     string[] | null
  intensity:        string | null
  duration_seconds: number | null
  created_at:       string
  behaviors:        { name: string } | null
}

export async function getBehaviorIncidentsByClientId(clientId: string): Promise<BehaviorIncidentRecord[]> {
  const { data, error } = await supabase
    .from('behavior_incidents')
    .select('id, session_id, behavior_id, antecedents, consequences, intensity, duration_seconds, created_at, behaviors(name)')
    .eq('client_id', clientId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []) as unknown as BehaviorIncidentRecord[]
}

export async function getSessionNotesByClientId(clientId: string): Promise<SessionNoteRecord[]> {
  const { data, error } = await supabase
    .from('session_notes')
    .select('id, session_id, staff_id, subjective, objective, assessment, plan, created_at')
    .eq('client_id', clientId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []) as SessionNoteRecord[]
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

export async function joinPractice(userId: string, joinCode: string, displayName: string): Promise<void> {
  const cleaned = joinCode.trim().toLowerCase()
  if (!cleaned) throw new Error('Please enter a join code.')

  const { data: practice, error: lookupError } = await supabase
    .from('practices')
    .select('id')
    .like('id', `${cleaned}%`)
    .maybeSingle()

  if (lookupError) throw lookupError
  if (!practice) throw new Error('No practice found with that code. Check with your supervisor.')

  const { error: memberError } = await supabase
    .from('practice_members')
    .insert({ practice_id: practice.id, user_id: userId, role: 'technician' })

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
