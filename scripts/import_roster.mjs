import { readFileSync } from "node:fs"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { createClient } from "@supabase/supabase-js"
import {
  importRosterRows,
  parseRosterCsv,
  setRosterImportCodePrefix,
  setRosterImportSupabase,
} from "../src/lib/rosterImport.ts"

const __dirname = dirname(fileURLToPath(import.meta.url))

const PRACTICE_SPG = "c3d4e5f6-5047-4000-8000-533047000001"
const PRACTICE_DEMO = "a1b2c3d4-0000-0000-0000-000000000001"

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
    // .env optional if vars set in shell
  }
  return env
}

function parseArgs(argv) {
  const all = argv.includes("--all")
  const practiceArg = argv.find((arg) => arg.startsWith("--practice-id="))
  const practiceId = practiceArg?.slice("--practice-id=".length)

  if (all && practiceId) {
    console.error("Use either --all or --practice-id=..., not both.")
    process.exit(1)
  }
  if (!all && !practiceId) {
    console.error("Usage:")
    console.error("  npm run import:roster -- --all          # demo practice only (16 clients)")
    console.error("  npm run import:roster -- --practice-id=<uuid>")
    process.exit(1)
  }

  return {
    // Single canonical practice — avoids duplicate EzHe/PeLe rows across Demo + SPG.
    practiceIds: all ? [PRACTICE_DEMO] : [practiceId],
  }
}

async function main() {
  const env = loadEnv()
  const url = env.SUPABASE_URL ?? env.VITE_SUPABASE_URL
  const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !serviceKey) {
    console.error(
      "Missing SUPABASE_URL/VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env",
    )
    process.exit(1)
  }

  const { practiceIds } = parseArgs(process.argv.slice(2))
  const csvPath = resolve(__dirname, "../templates/roster_import.csv")
  const csvText = readFileSync(csvPath, "utf8")
  const rows = parseRosterCsv(csvText)

  if (rows.length === 0) {
    console.error("No roster rows parsed from", csvPath)
    process.exit(1)
  }

  const supabase = createClient(url, serviceKey)
  setRosterImportSupabase(supabase)
  setRosterImportCodePrefix("SPG")

  console.log(`Importing ${rows.length} roster rows into ${practiceIds.length} practice(s)...`)

  for (const practiceId of practiceIds) {
    const label =
      practiceId === PRACTICE_SPG
        ? "Social Play Group"
        : practiceId === PRACTICE_DEMO
          ? "Coastal demo"
          : practiceId

    console.log(`\n=== ${label} (${practiceId}) ===`)
    const result = await importRosterRows(practiceId, rows)
    console.log(JSON.stringify(result, null, 2))
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
