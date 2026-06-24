import { parseCertification } from "@/lib/staff"
import type { RosterStaffRole } from "@/lib/staffRole"
import { staffRoleHeaderLabel } from "@/lib/staffRole"

const CERT_AMBER_DAYS = 60
const CERT_RED_DAYS = 30

export function formatProfileDate(iso: string): string {
  return new Date(iso + "T00:00:00").toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  })
}

export function factValue(value: string | null | undefined): string {
  const trimmed = value?.trim()
  return trimmed ? trimmed : "Not on file"
}

export function roleFactLabel(role: RosterStaffRole): string {
  return staffRoleHeaderLabel(role)
}

export function certExpiryDisplay(cert: string): {
  date: string
  ink: string | undefined
} {
  const parsed = parseCertification(cert)
  if (!parsed) {
    return { date: factValue(cert), ink: undefined }
  }

  const formatted = parsed.expiryDate.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  })

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const expiry = new Date(parsed.expiryDate)
  expiry.setHours(0, 0, 0, 0)
  const daysLeft = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

  if (daysLeft < CERT_RED_DAYS) {
    return { date: formatted, ink: "#B0492F" }
  }
  if (daysLeft < CERT_AMBER_DAYS) {
    return { date: formatted, ink: "#845A18" }
  }
  return { date: formatted, ink: undefined }
}
