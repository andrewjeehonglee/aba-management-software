import type { SupabaseClient } from "@supabase/supabase-js"

const STORAGE_KEY = "pulse-auth-diag"
const MAX_EVENTS = 50

export interface AuthDiagEntry {
  timestamp: string
  event: string
  email: string | null
  visibilityState: string
  onLine: boolean
  hasAuthStorageKey: boolean
  practiceError: string | null
  userInitiatedSignOut: boolean
}

let userInitiatedSignOut = false
let practiceErrorContext: string | null = null
let initialised = false

declare global {
  interface Window {
    __pulseAuthDiag?: {
      export: () => string
      clear: () => void
    }
  }
}

function readBuffer(): AuthDiagEntry[] {
  if (typeof sessionStorage === "undefined") return []
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as AuthDiagEntry[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function writeBuffer(entries: AuthDiagEntry[]) {
  if (typeof sessionStorage === "undefined") return
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(entries.slice(-MAX_EVENTS)))
  } catch {
    // sessionStorage full or unavailable — drop silently
  }
}

function hasAuthStorageKey(): boolean {
  if (typeof localStorage === "undefined") return false
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key?.includes("-auth-token")) return true
    }
  } catch {
    return false
  }
  return false
}

function pushEvent(
  event: string,
  email: string | null,
  options?: { userInitiatedSignOut?: boolean },
) {
  const entry: AuthDiagEntry = {
    timestamp: new Date().toISOString(),
    event,
    email,
    visibilityState: typeof document !== "undefined" ? document.visibilityState : "unknown",
    onLine: typeof navigator !== "undefined" ? navigator.onLine : true,
    hasAuthStorageKey: hasAuthStorageKey(),
    practiceError: practiceErrorContext,
    userInitiatedSignOut: options?.userInitiatedSignOut ?? userInitiatedSignOut,
  }

  const buffer = readBuffer()
  buffer.push(entry)
  writeBuffer(buffer)
}

export function setAuthDiagnosticPracticeError(error: string | null) {
  practiceErrorContext = error
}

export function markUserSignOut() {
  userInitiatedSignOut = true
  pushEvent("user:signOut_initiated", null, { userInitiatedSignOut: true })
}

export function logAuthGate(reason: string) {
  pushEvent(`gate:${reason}`, null)
}

export function initAuthDiagnostics(supabase: SupabaseClient) {
  if (initialised) return
  initialised = true

  supabase.auth.onAuthStateChange((event, session) => {
    const initiated = userInitiatedSignOut
    pushEvent(`auth:${event}`, session?.user?.email ?? null, {
      userInitiatedSignOut: initiated,
    })
    if (event === "SIGNED_OUT") {
      userInitiatedSignOut = false
    }
  })

  if (typeof window !== "undefined") {
    window.__pulseAuthDiag = {
      export: () => JSON.stringify(readBuffer(), null, 2),
      clear: () => {
        sessionStorage.removeItem(STORAGE_KEY)
        userInitiatedSignOut = false
      },
    }
  }
}
