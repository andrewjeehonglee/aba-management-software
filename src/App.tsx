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

  async function checkPractice(userId: string) {
    console.log('[App] checkPractice called for', userId)
    const data = await getUserPractice(userId)
    console.log('[App] checkPractice result:', data)
    setPractice(data)
    if (data) {
      getUserRole(userId, data.practice_id)
        .then(setUserRole)
        .catch(err => console.error('[App] getUserRole failed:', err))
      getStaffByUserId(userId)
        .then(setCurrentStaffId)
        .catch(err => console.error('[App] getStaffByUserId failed:', err))
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
        setSession(session)
        if (session) {
          await checkPractice(session.user.id)
        } else {
          setPractice(null)
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
