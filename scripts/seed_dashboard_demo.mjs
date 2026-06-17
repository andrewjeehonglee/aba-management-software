/**
 * Apply dashboard demo data via Supabase REST (no SQL editor required).
 * Ensures all 6 technicians have June hours + supervision rows using the same
 * thresholds as BCBA/supervisor tiles (5% supervision received, 50% direct).
 *
 * Usage: npm run seed:dashboard
 */
import { readFileSync } from "node:fs"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { createClient } from "@supabase/supabase-js"

const __dirname = dirname(fileURLToPath(import.meta.url))

const PRACTICES = [
  "c3d4e5f6-5047-4000-8000-533047000001",
  "a1b2c3d4-0000-0000-0000-000000000001",
]

const SOAP = {
  subjective: "Client engaged with treatment targets; session completed per plan.",
  objective: "Data collected on active programs.",
  assessment: "Progress consistent with goals.",
  plan: "Continue current protocol.",
}

/** June 2026 billable mix + supervision % (received). */
const TECHNICIANS = [
  {
    code: "SPG-BT-jazmine",
    clients: ["PeLe", "BrTu"],
    supervisionPct: 7.0,
    directCount: 8,
    indirectCount: 1,
    extraIndirect: 0,
    noteGap: "overdue",
  },
  {
    code: "SPG-BT-enny",
    clients: ["Ells", "IsRi"],
    supervisionPct: 6.5,
    directCount: 8,
    indirectCount: 0,
    extraIndirect: 0,
    noteGap: null,
  },
  {
    code: "SPG-BT-emaya",
    clients: ["AlLo"],
    supervisionPct: 5.8,
    directCount: 6,
    indirectCount: 0,
    extraIndirect: 0,
    noteGap: null,
  },
  {
    code: "SPG-BT-daniel",
    clients: ["LiBo"],
    supervisionPct: 4.2,
    directCount: 3,
    indirectCount: 6,
    extraIndirect: 10,
    noteGap: null,
  },
  {
    code: "SPG-BT-lisa",
    clients: ["CoTa", "LoEl"],
    supervisionPct: 3.8,
    directCount: 3,
    indirectCount: 6,
    extraIndirect: 12,
    noteGap: "overdue",
  },
  {
    code: "SPG-BT-valerie",
    clients: ["YaNu", "ZiTr"],
    supervisionPct: 3.2,
    directCount: 5,
    indirectCount: 1,
    extraIndirect: 0,
    noteGap: "missing",
  },
]

function loadEnv() {
  const env = {}
  try {
    const envText = readFileSync(resolve(__dirname, "../.env"), "utf8")
    for (const line of envText.split(/\r?\n/)) {
      if (!line || line.startsWith("#")) continue
      const i = line.indexOf("=")
      env[line.slice(0, i)] = line.slice(i + 1).trim()
    }
  } catch {
    // optional
  }
  return env
}

function isoJune(day, hour = 9, clientIndex = 0) {
  const h = String(hour).padStart(2, "0")
  return `2026-06-${String(day).padStart(2, "0")}T${h}:00:00-07:00`
}

async function getIdMap(supabase, practiceId, table, codes, codeField = "external_code") {
  const { data, error } = await supabase
    .from(table)
    .select(`id, ${codeField}`)
    .eq("practice_id", practiceId)
    .in(codeField, codes)
  if (error) throw error
  const map = new Map()
  for (const row of data ?? []) {
    map.set(row[codeField], row.id)
  }
  return map
}

async function upsertSupervision(supabase, practiceId, staffId, pct) {
  const { data: existing } = await supabase
    .from("supervision")
    .select("id")
    .eq("staff_id", staffId)
    .eq("period_start", "2026-06-01")
    .eq("period_end", "2026-06-30")
    .maybeSingle()

  if (existing?.id) {
    await supabase
      .from("supervision")
      .update({ supervision_pct: pct })
      .eq("id", existing.id)
  } else {
    await supabase.from("supervision").insert({
      practice_id: practiceId,
      staff_id: staffId,
      supervision_pct: pct,
      period_start: "2026-06-01",
      period_end: "2026-06-30",
    })
  }
}

async function ensureSession(supabase, practiceId, clientId, staffId, scheduledAt, sessionType) {
  const { data: existing } = await supabase
    .from("sessions")
    .select("id")
    .eq("practice_id", practiceId)
    .eq("client_id", clientId)
    .eq("staff_id", staffId)
    .eq("scheduled_at", scheduledAt)
    .maybeSingle()

  if (existing?.id) return existing.id

  const { data, error } = await supabase
    .from("sessions")
    .insert({
      practice_id: practiceId,
      client_id: clientId,
      staff_id: staffId,
      session_type: sessionType,
      status: "completed",
      scheduled_at: scheduledAt,
    })
    .select("id")
    .single()

  if (error) throw error
  return data.id
}

async function ensureNote(supabase, practiceId, sessionId, clientId, staffId) {
  const { data: existing } = await supabase
    .from("session_notes")
    .select("id")
    .eq("session_id", sessionId)
    .maybeSingle()

  if (existing?.id) return

  await supabase.from("session_notes").insert({
    practice_id: practiceId,
    session_id: sessionId,
    client_id: clientId,
    staff_id: staffId,
    ...SOAP,
  })
}

async function stripNote(supabase, sessionId) {
  await supabase.from("session_notes").delete().eq("session_id", sessionId)
}

async function seedTechnician(supabase, practiceId, tech, clientMap, staffMap) {
  const staffId = staffMap.get(tech.code)
  if (!staffId) {
    console.warn(`  skip ${tech.code} — staff not found`)
    return
  }

  await upsertSupervision(supabase, practiceId, staffId, tech.supervisionPct)

  let day = 2
  for (let i = 0; i < tech.directCount; i++) {
    const clientCode = tech.clients[i % tech.clients.length]
    const clientId = clientMap.get(clientCode)
    if (!clientId) continue
    const at = isoJune(day, 9 + (i % 3), i)
    const sessionId = await ensureSession(supabase, practiceId, clientId, staffId, at, "direct")
    await ensureNote(supabase, practiceId, sessionId, clientId, staffId)
    day += 2
    if (day > 28) day = 2
  }

  for (let i = 0; i < tech.indirectCount; i++) {
    const clientCode = tech.clients[i % tech.clients.length]
    const clientId = clientMap.get(clientCode)
    if (!clientId) continue
    const at = isoJune(17 + i, 11 + i, i)
    const sessionId = await ensureSession(supabase, practiceId, clientId, staffId, at, "indirect")
    await ensureNote(supabase, practiceId, sessionId, clientId, staffId)
  }

  for (let i = 0; i < tech.extraIndirect; i++) {
    const clientCode = tech.clients[i % tech.clients.length]
    const clientId = clientMap.get(clientCode)
    if (!clientId) continue
    const day = 18 + (i % 10)
    const at = isoJune(day, 12 + (i % 4), i)
    const sessionId = await ensureSession(supabase, practiceId, clientId, staffId, at, "indirect")
    await ensureNote(supabase, practiceId, sessionId, clientId, staffId)
  }

  if (tech.noteGap === "overdue") {
    const clientId = clientMap.get(tech.clients[0])
    if (clientId) {
      const morning = "2026-06-16T08:00:00-07:00"
      const afternoon = "2026-06-16T14:30:00-07:00"
      const morningId = await ensureSession(supabase, practiceId, clientId, staffId, morning, "direct")
      await stripNote(supabase, morningId)
      const afternoonId = await ensureSession(
        supabase,
        practiceId,
        clientId,
        staffId,
        afternoon,
        "direct",
      )
      await ensureNote(supabase, practiceId, afternoonId, clientId, staffId)
    }
  }

  if (tech.noteGap === "missing") {
    const clientId = clientMap.get(tech.clients[0])
    if (clientId) {
      const sessionId = await ensureSession(
        supabase,
        practiceId,
        clientId,
        staffId,
        "2026-06-20T16:00:00-07:00",
        "direct",
      )
      await stripNote(supabase, sessionId)
    }
  }

  console.log(`  ${tech.code}: supervision ${tech.supervisionPct}%`)
}

async function main() {
  const env = loadEnv()
  const url = env.SUPABASE_URL ?? env.VITE_SUPABASE_URL
  const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !serviceKey) {
    console.error("Missing VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env")
    process.exit(1)
  }

  const supabase = createClient(url, serviceKey)
  const clientCodes = [
    "PeLe", "BrTu", "Ells", "AlLo", "LiBo", "IsRi", "CoTa", "LoEl", "YaNu", "ZiTr",
  ]
  const staffCodes = TECHNICIANS.map((t) => t.code)

  for (const practiceId of PRACTICES) {
    console.log(`Practice ${practiceId}`)
    const clientMap = await getIdMap(supabase, practiceId, "clients", clientCodes)
    const staffMap = await getIdMap(supabase, practiceId, "staff", staffCodes)

    for (const tech of TECHNICIANS) {
      await seedTechnician(supabase, practiceId, tech, clientMap, staffMap)
    }
  }

  console.log("Dashboard demo seed complete.")
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
