import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

const envText = readFileSync('.env', 'utf8')
const env = {}
for (const line of envText.split(/\r?\n/)) {
  if (!line || line.startsWith('#')) continue
  const i = line.indexOf('=')
  env[line.slice(0, i)] = line.slice(i + 1).trim()
}

const sb = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY)
const { error: authErr } = await sb.auth.signInWithPassword({
  email: 'demo@pulseaba.app',
  password: 'PulseDemo2026!',
})
if (authErr) {
  console.error('auth', authErr)
  process.exit(1)
}

const sup = await sb.from('supervision').select(
  'id, staff_id, supervision_pct, period_start, period_end, staff(full_name, team, role)',
)
console.log('supervision rows:', sup.error?.message ?? sup.data?.length)
if (sup.error) console.error(sup.error)
if (sup.data) {
  for (const r of sup.data) {
    console.log(' ', r.staff?.full_name, r.supervision_pct, r.period_start, r.staff_id?.slice(0, 8))
  }
}

const sarah = await sb.from('staff').select('id, full_name, team, role').eq('full_name', 'Sarah Chen').maybeSingle()
console.log('\nSarah:', sarah.data)

const staff = await sb.from('staff').select('id, full_name, team, role').order('full_name')
const teamA = staff.data?.filter(
  (s) => (s.team || '').replace(/^Team\s+/i, '').trim() === 'A' && (s.role || '').toLowerCase() === 'technician',
)
console.log('\nTeam A techs:', teamA?.map((s) => `${s.full_name} ${s.id.slice(-4)}`))

const ids = teamA?.map((s) => s.id) ?? []
if (ids.length) {
  const scoped = await sb
    .from('supervision')
    .select('id, supervision_pct, period_start, period_end, staff(full_name, team)')
    .in('staff_id', ids)
  console.log('\nScoped supervision:', scoped.error?.message ?? scoped.data?.length)
  if (scoped.error) console.error(scoped.error)
  scoped.data?.forEach((r) => console.log(' ', r.staff?.full_name, r.supervision_pct, r.period_start))
}

const mike = await sb.from('staff').select('id').eq('full_name', 'Mike Torres').maybeSingle()
if (mike.data) {
  const mikeSup = await sb.from('supervision').select('*').eq('staff_id', mike.data.id)
  console.log('\nMike supervision:', mikeSup.error?.message ?? mikeSup.data?.length, mikeSup.data)
}
