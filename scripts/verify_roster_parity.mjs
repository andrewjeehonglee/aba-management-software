/**
 * Phase 7 Slice #7g — Roster parity verification (demo + SPG).
 * Source of truth: templates/roster_import.csv
 *
 * Usage: npm run verify:roster
 * Requires SUPABASE_SERVICE_ROLE_KEY (+ URL) in .env
 */
import { readFileSync } from "node:fs"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { createClient } from "@supabase/supabase-js"

const __dirname = dirname(fileURLToPath(import.meta.url))

const PRACTICE_DEMO = "a1b2c3d4-0000-0000-0000-000000000001"
const PRACTICE_SPG = "c3d4e5f6-5047-4000-8000-533047000001"

const EXPECTED_STAFF = {
  bcba: ["Jennifer", "Blair", "Annie"],
  supervisor: ["Hilary", "AJ", "Bryanna", "Madeline", "Carmen"],
  technician: ["Jazmine", "Enny", "Emaya", "Daniel", "Lisa", "Valerie"],
}

const EXPECTED_CLIENT_CODES = [
  "PeLe", "BrTu", "Ells", "AlLo", "LiBo", "IsRi", "CoTa", "LoEl",
  "ViReMo", "LaGu", "SuAz", "LuMa", "EzHe", "GrMa", "YaNu", "ZiTr",
]

const EXPECTED_STAFF_EXTERNAL_CODES = [
  "SPG-BCBA-jennifer",
  "SPG-BCBA-blair",
  "SPG-BCBA-annie",
  "SPG-SUP-hilary",
  "SPG-SUP-aj",
  "SPG-SUP-bryanna",
  "SPG-SUP-madeline",
  "SPG-SUP-carmen",
  "SPG-BT-jazmine",
  "SPG-BT-enny",
  "SPG-BT-emaya",
  "SPG-BT-daniel",
  "SPG-BT-lisa",
  "SPG-BT-valerie",
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

function parseCsvStaffAndClients(csvText) {
  const lines = csvText.trim().split(/\r?\n/)
  const header = lines[0].split(",")
  const clientIdx = header.indexOf("client_code")
  const bcbaIdx = header.indexOf("bcba_name")
  const supIdx = header.indexOf("clinical_supervisor_name")
  const btIdx = header.indexOf("primary_bt_name")

  const clientCodes = []
  const staffNames = { bcba: new Set(), supervisor: new Set(), technician: new Set() }

  for (const line of lines.slice(1)) {
    if (!line.trim()) continue
    const cols = line.split(",")
    clientCodes.push(cols[clientIdx]?.trim())
    staffNames.bcba.add(cols[bcbaIdx]?.trim())
    staffNames.supervisor.add(cols[supIdx]?.trim())
    const bt = cols[btIdx]?.trim()
    if (bt && !["x", "X", "-", "—", ""].includes(bt)) {
      staffNames.technician.add(bt)
    }
  }

  return { clientCodes, staffNames }
}

function firstName(fullName) {
  return fullName?.split(/\s+/)[0] ?? ""
}

async function verifyPractice(supabase, practiceId, label, csvStaff, csvClients) {
  const errors = []

  const { data: staffRows, error: staffErr } = await supabase
    .from("staff")
    .select("id, full_name, external_code, role, status")
    .eq("practice_id", practiceId)
    .not("external_code", "is", null)
    .eq("status", "active")

  if (staffErr) throw staffErr

  const { data: clientRows, error: clientErr } = await supabase
    .from("clients")
    .select("id, external_code, status")
    .eq("practice_id", practiceId)
    .not("external_code", "is", null)
    .eq("status", "active")

  if (clientErr) throw clientErr

  const { count: legacyStaff } = await supabase
    .from("staff")
    .select("id", { count: "exact", head: true })
    .eq("practice_id", practiceId)
    .is("external_code", null)
    .eq("status", "active")

  const { count: legacyClients } = await supabase
    .from("clients")
    .select("id", { count: "exact", head: true })
    .eq("practice_id", practiceId)
    .is("external_code", null)
    .eq("status", "active")

  for (const [role, expectedNames] of Object.entries(EXPECTED_STAFF)) {
    const dbNames = staffRows
      .filter((s) => s.role === role)
      .map((s) => firstName(s.full_name))
      .sort()
    const exp = [...expectedNames].sort()
    if (dbNames.length !== exp.length || !exp.every((n, i) => dbNames[i] === n)) {
      errors.push(`${label}: staff ${role} mismatch — expected [${exp.join(", ")}], got [${dbNames.join(", ")}]`)
    }
  }

  const dbClientCodes = clientRows.map((c) => c.external_code).sort()
  const expClients = [...EXPECTED_CLIENT_CODES].sort()
  if (
    dbClientCodes.length !== expClients.length ||
    !expClients.every((c, i) => dbClientCodes[i] === c)
  ) {
    errors.push(
      `${label}: client codes mismatch — expected ${expClients.length}, got ${dbClientCodes.length}`,
    )
  }

  for (const code of csvClients) {
    if (!dbClientCodes.includes(code)) {
      errors.push(`${label}: CSV client ${code} missing from DB roster`)
    }
  }

  const roleCounts = {}
  for (const s of staffRows) {
    roleCounts[s.role] = (roleCounts[s.role] ?? 0) + 1
  }
  const totalStaff = staffRows.length
  if (totalStaff !== 14) {
    errors.push(`${label}: expected 14 roster staff, got ${totalStaff}`)
  }

  const dbExternalCodes = staffRows.map((s) => s.external_code).sort()
  for (const code of EXPECTED_STAFF_EXTERNAL_CODES) {
    if (!dbExternalCodes.includes(code)) {
      errors.push(`${label}: missing staff external_code ${code} (route /staff/${code})`)
    }
  }

  if (clientRows.length !== 16) {
    errors.push(`${label}: expected 16 roster clients, got ${clientRows.length}`)
  }

  const rosterClientIds = clientRows.map((c) => c.id)
  const { data: assignments } = await supabase
    .from("client_assignments")
    .select("assignment_role, is_active")
    .in("client_id", rosterClientIds)
    .eq("is_active", true)

  const assignCounts = {}
  for (const a of assignments ?? []) {
    assignCounts[a.assignment_role] = (assignCounts[a.assignment_role] ?? 0) + 1
  }

  if (assignCounts.primary_bcba !== 16) {
    errors.push(`${label}: expected 16 primary_bcba assignments, got ${assignCounts.primary_bcba ?? 0}`)
  }
  if (assignCounts.clinical_supervisor !== 16) {
    errors.push(
      `${label}: expected 16 clinical_supervisor assignments, got ${assignCounts.clinical_supervisor ?? 0}`,
    )
  }
  if (assignCounts.primary_bt !== 11) {
    errors.push(`${label}: expected 11 primary_bt assignments, got ${assignCounts.primary_bt ?? 0}`)
  }

  if ((legacyStaff ?? 0) > 0) {
    errors.push(`${label}: ${legacyStaff} active legacy staff (external_code IS NULL)`)
  }
  if ((legacyClients ?? 0) > 0) {
    errors.push(`${label}: ${legacyClients} active legacy clients (external_code IS NULL)`)
  }

  const jazmine = staffRows.find((s) => s.external_code === "SPG-BT-jazmine")
  const pele = clientRows.find((c) => c.external_code === "PeLe")

  console.log(`\n=== ${label} (${practiceId}) ===`)
  console.log(`  Staff by role:`, roleCounts)
  console.log(`  Clients: ${clientRows.length}`)
  console.log(`  Assignments: bcba=${assignCounts.primary_bcba ?? 0}, sup=${assignCounts.clinical_supervisor ?? 0}, bt=${assignCounts.primary_bt ?? 0}`)
  console.log(`  Legacy active: staff=${legacyStaff ?? 0}, clients=${legacyClients ?? 0}`)
  console.log(`  Staff routes: ${EXPECTED_STAFF_EXTERNAL_CODES.length} external codes checked`)
  if (jazmine) console.log(`  Route /staff/SPG-BT-jazmine → ${jazmine.id}`)
  if (pele) console.log(`  Route /clients/PeLe → ${pele.id}`)

  return errors
}

async function main() {
  const env = loadEnv()
  const url = env.SUPABASE_URL ?? env.VITE_SUPABASE_URL
  const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !serviceKey) {
    console.error("Missing SUPABASE_URL/VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env")
    process.exit(1)
  }

  const csvPath = resolve(__dirname, "../templates/roster_import.csv")
  const csvText = readFileSync(csvPath, "utf8")
  const { clientCodes, staffNames } = parseCsvStaffAndClients(csvText)

  const supabase = createClient(url, serviceKey)
  const allErrors = []

  for (const [practiceId, label] of [
    [PRACTICE_DEMO, "Demo"],
    [PRACTICE_SPG, "SPG"],
  ]) {
    const errs = await verifyPractice(supabase, practiceId, label, staffNames, clientCodes)
    allErrors.push(...errs)
  }

  if (allErrors.length > 0) {
    console.error("\nFAIL — roster parity errors:")
    for (const e of allErrors) console.error("  •", e)
    process.exit(1)
  }

  console.log("\nPASS — roster parity verified for Demo + SPG")
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
