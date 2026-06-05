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
  console.error('auth failed', authErr.message)
  process.exit(1)
}
console.log('signed in as demo')

const clients = [
  ['Emma', '20000000-0000-0000-0000-000000000001'],
  ['Ava', '20000000-0000-0000-0000-000000000003'],
  ['Isabella', '20000000-0000-0000-0000-000000000007'],
  ['Aiden', '20000000-0000-0000-0000-000000000008'],
]

const { data: membership } = await sb.from('practice_members').select('role').maybeSingle()
console.log('practice role:', membership?.role)

for (const [name, cid] of clients) {
  const inc1 = await sb.from('behavior_incidents').select('id').eq('client_id', cid)
  const inc2 = await sb.from('behavior_incidents').select('id, behaviors(name)').eq('client_id', cid)
  const notes = await sb.from('session_notes').select('id, session_id').eq('client_id', cid)
  const sessions = await sb.from('sessions').select('id, staff(full_name)').eq('client_id', cid).limit(3)
  const client = await sb.from('clients').select('assigned_staff_id, staff!assigned_staff_id(full_name)').eq('id', cid).maybeSingle()
  const sessionIds = [...new Set((notes.data ?? []).map((n) => n.session_id))]
  const mapQ = sessionIds.length
    ? await sb.from('sessions').select('id, scheduled_at').in('id', sessionIds)
    : { data: [], error: null }
  console.log(`\n${name} (${cid.slice(-3)})`)
  console.log('  incidents plain:', inc1.error?.message ?? inc1.data?.length)
  console.log('  incidents+behaviors:', inc2.error?.message ?? inc2.data?.length)
  console.log('  notes:', notes.error?.message ?? notes.data?.length)
  console.log('  session map:', mapQ.error?.message ?? mapQ.data?.length)
  console.log('  sessions:', sessions.error?.message ?? sessions.data?.length, sessions.data?.[0]?.staff)
  console.log('  client staff:', client.error?.message ?? JSON.stringify(client.data))
}
