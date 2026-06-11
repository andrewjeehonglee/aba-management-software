/** Demo-safe contact info derived from roster external_code (no DB columns yet). */
export function demoStaffEmail(externalCode: string | null | undefined): string {
  if (!externalCode?.trim()) return "—"
  const slug = externalCode.split("-").pop()?.toLowerCase() ?? "staff"
  return `${slug}@pulseaba.demo`
}

export function demoStaffPhone(externalCode: string | null | undefined): string {
  if (!externalCode?.trim()) return "—"
  const slug = externalCode.split("-").pop()?.toLowerCase() ?? "staff"
  let hash = 0
  for (let i = 0; i < slug.length; i++) {
    hash = (hash * 31 + slug.charCodeAt(i)) % 9000
  }
  const ext = 1000 + hash
  return `(555) 010-${ext}`
}
