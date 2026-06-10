import { toSlug } from "@/lib/slug"
import { supabase, type ClientDetail } from "@/lib/supabase"

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function isUuid(value: string): boolean {
  return UUID_RE.test(value)
}

/** Roster entity: imported external_code present and not inactive. */
export function isRosterEntity(
  externalCode: string | null | undefined,
  status?: string | null,
): boolean {
  if (!externalCode?.trim()) return false
  if ((status ?? "active").toLowerCase() === "inactive") return false
  return true
}

export interface RosterStaffEntry {
  id: string
  fullName: string
  externalCode: string
  role: string
}

export interface RosterClientEntry {
  id: string
  externalCode: string
  displayName: string
}

export function staffProfilePath(externalCode: string): string {
  return `/staff/${encodeURIComponent(externalCode)}`
}

export function clientProfilePath(idOrCode: string): string {
  return `/clients/${encodeURIComponent(idOrCode)}`
}

export async function getRosterStaffIds(practiceId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from("staff")
    .select("id")
    .eq("practice_id", practiceId)
    .not("external_code", "is", null)
    .neq("external_code", "")
    .eq("status", "active")

  if (error) throw error
  return ((data ?? []) as { id: string }[]).map((row) => row.id)
}

/** Imported roster BTs/RBTs — owner notes/hours tiles (excludes BCBA/supervisor admin). */
export async function getRosterTechnicianStaffIds(practiceId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from("staff")
    .select("id")
    .eq("practice_id", practiceId)
    .eq("role", "technician")
    .not("external_code", "is", null)
    .neq("external_code", "")
    .eq("status", "active")

  if (error) throw error
  return ((data ?? []) as { id: string }[]).map((row) => row.id)
}

export async function getRosterClientIds(practiceId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from("clients")
    .select("id")
    .eq("practice_id", practiceId)
    .eq("status", "active")
    .not("external_code", "is", null)
    .neq("external_code", "")

  if (error) throw error
  return ((data ?? []) as { id: string }[]).map((row) => row.id)
}

export async function getRosterStaffByRole(
  practiceId: string,
  role: "bcba" | "supervisor" | "technician",
): Promise<RosterStaffEntry[]> {
  const { data, error } = await supabase
    .from("staff")
    .select("id, full_name, external_code, role")
    .eq("practice_id", practiceId)
    .eq("role", role)
    .not("external_code", "is", null)
    .neq("external_code", "")
    .eq("status", "active")
    .order("full_name", { ascending: true })

  if (error) throw error

  return ((data ?? []) as { id: string; full_name: string; external_code: string; role: string }[])
    .filter((row) => isRosterEntity(row.external_code, "active"))
    .map((row) => ({
      id: row.id,
      fullName: row.full_name,
      externalCode: row.external_code,
      role: row.role,
    }))
}

export async function getRosterStaffManifest(practiceId: string): Promise<RosterStaffEntry[]> {
  const { data, error } = await supabase
    .from("staff")
    .select("id, full_name, external_code, role")
    .eq("practice_id", practiceId)
    .not("external_code", "is", null)
    .neq("external_code", "")
    .eq("status", "active")
    .order("role", { ascending: true })
    .order("full_name", { ascending: true })

  if (error) throw error

  return ((data ?? []) as { id: string; full_name: string; external_code: string; role: string }[])
    .filter((row) => isRosterEntity(row.external_code, "active"))
    .map((row) => ({
      id: row.id,
      fullName: row.full_name,
      externalCode: row.external_code,
      role: row.role,
    }))
}

export async function getRosterClients(practiceId: string): Promise<RosterClientEntry[]> {
  const { data, error } = await supabase
    .from("clients")
    .select("id, external_code, first_name, last_name")
    .eq("practice_id", practiceId)
    .eq("status", "active")
    .not("external_code", "is", null)
    .neq("external_code", "")
    .order("external_code", { ascending: true })

  if (error) throw error

  return ((data ?? []) as {
    id: string
    external_code: string
    first_name: string | null
    last_name: string | null
  }[]).map((row) => {
    const parts = [row.first_name, row.last_name].filter(Boolean)
    return {
      id: row.id,
      externalCode: row.external_code,
      displayName: parts.length > 0 ? parts.join(" ") : row.external_code,
    }
  })
}

type StaffRow = {
  id: string
  full_name: string
  external_code: string | null
  role: string
  status: string | null
}

function mapStaffRow(row: StaffRow): RosterStaffEntry | null {
  if (!isRosterEntity(row.external_code, row.status)) return null
  return {
    id: row.id,
    fullName: row.full_name,
    externalCode: row.external_code as string,
    role: row.role,
  }
}

export async function resolveStaffByRouteKey(
  practiceId: string,
  routeKey: string,
): Promise<RosterStaffEntry | null> {
  if (!routeKey.trim()) return null

  if (isUuid(routeKey)) {
    const { data, error } = await supabase
      .from("staff")
      .select("id, full_name, external_code, role, status")
      .eq("practice_id", practiceId)
      .eq("id", routeKey)
      .maybeSingle()

    if (error) throw error
    return data ? mapStaffRow(data as StaffRow) : null
  }

  const { data: byCode, error: codeError } = await supabase
    .from("staff")
    .select("id, full_name, external_code, role, status")
    .eq("practice_id", practiceId)
    .eq("external_code", routeKey)
    .maybeSingle()

  if (codeError) throw codeError
  if (byCode) return mapStaffRow(byCode as StaffRow)

  const manifest = await getRosterStaffManifest(practiceId)
  const slugKey = routeKey.toLowerCase()
  const bySlug = manifest.find((s) => toSlug(s.fullName) === slugKey)
  return bySlug ?? null
}

const CLIENT_DETAIL_COLUMNS =
  "id, external_code, first_name, last_name, date_of_birth, home_address, status, team, insurance, auth_start_date, auth_end_date, cpt_codes"

async function fetchClientDetailRow(
  practiceId: string,
  routeKey: string,
): Promise<Omit<ClientDetail, "assigned_staff"> | null> {
  let query = supabase
    .from("clients")
    .select(CLIENT_DETAIL_COLUMNS)
    .eq("practice_id", practiceId)

  query = isUuid(routeKey)
    ? query.eq("id", routeKey)
    : query.eq("external_code", routeKey)

  let { data, error } = await query.maybeSingle()

  if (error?.message?.includes("home_address")) {
    const fallback = supabase
      .from("clients")
      .select(
        "id, external_code, first_name, last_name, date_of_birth, status, team, insurance, auth_start_date, auth_end_date, cpt_codes",
      )
      .eq("practice_id", practiceId)
    const q = isUuid(routeKey)
      ? fallback.eq("id", routeKey)
      : fallback.eq("external_code", routeKey)
    ;({ data, error } = await q.maybeSingle())
    if (data) {
      data = { ...data, home_address: null }
    }
  }

  if (error) throw error
  if (!data) return null

  const row = data as Omit<ClientDetail, "assigned_staff">
  if (!isRosterEntity(row.external_code, row.status)) return null
  return row
}

export async function resolveClientByRouteKey(
  practiceId: string,
  routeKey: string,
): Promise<ClientDetail | null> {
  if (!routeKey.trim()) return null

  const row = await fetchClientDetailRow(practiceId, routeKey)
  if (!row) return null

  return {
    ...row,
    assigned_staff: null,
  }
}
