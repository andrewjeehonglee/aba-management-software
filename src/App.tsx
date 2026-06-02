import { useEffect, useState } from "react"
import { Route, Routes } from "react-router-dom"
import type { Session } from "@supabase/supabase-js"
import { ClientOverviewPage } from "@/pages/ClientOverviewPage"
import { DashboardPage } from "@/pages/DashboardPage"
import { AuthPage } from "@/pages/AuthPage"
import { CreatePracticePage } from "@/pages/CreatePracticePage"
import { SessionViewPage } from "@/pages/SessionViewPage"
import { StaffOverviewPage } from "@/pages/StaffOverviewPage"
import { supabase, getUserPractice, getUserRole, getStaffByUserId } from "@/lib/supabase"
import type { PracticeMembership } from "@/lib/supabase"

function App() {
  const [session, setSession] = useState<Session | null>(null)
  const [practice, setPractice] = useState<PracticeMembership | null>(null)
  const [userRole, setUserRole] = useState<string>("technician")
  const [currentStaffId, setCurrentStaffId] = useState<string | null>(null)
  // loading stays true until BOTH the session check AND the practice check
  // (when applicable) have resolved — prevents any intermediate flash.
  const [loading, setLoading] = useState(true)
  // Set when the practice lookup fails operationally (query error / timeout).
  // This is distinct from "no practice yet" (practice === null after success).
  const [practiceError, setPracticeError] = useState<string | null>(null)

  async function checkPractice(userId: string) {
    console.log('[App] checkPractice called for', userId)
    try {
      const data = await getUserPractice(userId)
      console.log('[App] checkPractice result:', data)
      // We reached here only on a genuine success. A null `data` now means the
      // user truly has no practice yet (zero rows) — safe to send to onboarding.
      setPracticeError(null)
      setPractice(data)
      if (data) {
        getUserRole(userId, data.practice_id)
          .then(setUserRole)
          .catch(err => console.error('[App] getUserRole failed:', err))
        getStaffByUserId(userId)
          .then(setCurrentStaffId)
          .catch(err => console.error('[App] getStaffByUserId failed:', err))
      }
    } catch (err) {
      // getUserPractice throws (PracticeLookupError) on a query error/timeout.
      // This is NOT "no practice" — surface it and keep any practice we already
      // had instead of dropping the user onto the onboarding screen.
      console.error('[App] checkPractice failed:', err)
      setPracticeError(err instanceof Error ? err.message : 'Could not load your practice. Please try again.')
    }
  }

  useEffect(() => {
    let initialised = false

    console.log('[App] mounting — calling getSession()')
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      console.log('[App] getSession resolved, session:', session?.user?.email ?? null)
      setSession(session)
      if (session) {
        await checkPractice(session.user.id)
      }
      initialised = true
      setLoading(false)
      console.log('[App] loading = false (getSession path)')
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('[App] onAuthStateChange event:', event, 'user:', session?.user?.email ?? null)

        // Only an explicit sign-out should send the user back to AuthPage.
        // A transient null session (which can arrive during a token refresh)
        // must NOT clear our state, or the user gets bounced on a timer.
        if (event === 'SIGNED_OUT') {
          setSession(null)
          setPractice(null)
          setCurrentStaffId(null)
          if (!initialised) {
            initialised = true
            setLoading(false)
          }
          return
        }

        // For every other event, ignore a null payload and keep the session we
        // already have. A valid session payload is always safe to apply (it
        // carries the freshly refreshed access/refresh tokens).
        if (!session) {
          if (!initialised) {
            initialised = true
            setLoading(false)
          }
          return
        }

        setSession(session)

        // TOKEN_REFRESHED / USER_UPDATED only rotate the token for the same
        // user — there's no need to re-fetch the practice (and pay the 8s
        // getUserPractice timeout) on every refresh tick. Only (re)check the
        // practice when we don't already have one for this user.
        if (event !== 'TOKEN_REFRESHED' && event !== 'USER_UPDATED') {
          await checkPractice(session.user.id)
        }

        // Ensure loading clears even if onAuthStateChange fires before getSession resolves
        if (!initialised) {
          initialised = true
          setLoading(false)
          console.log('[App] loading = false (onAuthStateChange path)')
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  // Visible spinner instead of null — makes "stuck loading" obvious in the UI
  // and tells us we're in the loading state, not a crash.
  if (loading) {
    return (
      <div className="min-h-svh flex items-center justify-center bg-background">
        <p className="text-sm text-muted-foreground animate-pulse">Loading…</p>
      </div>
    )
  }

  if (!session) return <AuthPage />

  // The practice lookup failed operationally (query error / timeout). Show a
  // visible, retryable error instead of the onboarding screen — the user may
  // well belong to a practice; we just couldn't confirm it.
  if (practiceError && !practice) {
    return (
      <div className="min-h-svh flex items-center justify-center bg-background p-4">
        <div className="w-full max-w-sm space-y-4 text-center">
          <h1 className="text-lg font-semibold tracking-tight">Couldn't load your practice</h1>
          <p className="text-sm text-muted-foreground">{practiceError}</p>
          <button
            type="button"
            className="inline-flex h-9 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            onClick={() => { setPracticeError(null); checkPractice(session.user.id) }}
          >
            Try again
          </button>
        </div>
      </div>
    )
  }

  if (!practice) {
    return (
      <CreatePracticePage
        userId={session.user.id}
        onPracticeCreated={() => checkPractice(session.user.id)}
      />
    )
  }

  return (
    <Routes>
      <Route path="/" element={<DashboardPage practiceId={practice.practice_id} userRole={userRole} currentStaffId={currentStaffId} />} />
      <Route path="/clients/:clientId" element={<ClientOverviewPage />} />
      <Route path="/staff/:staffId" element={<StaffOverviewPage />} />
      <Route path="/session/:sessionId" element={<SessionViewPage />} />
    </Routes>
  )
}

export default App
