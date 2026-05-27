import { useEffect, useState } from "react"
import { Route, Routes } from "react-router-dom"
import type { Session } from "@supabase/supabase-js"
import { ClientOverviewPage } from "@/pages/ClientOverviewPage"
import { DashboardPage } from "@/pages/DashboardPage"
import { AuthPage } from "@/pages/AuthPage"
import { CreatePracticePage } from "@/pages/CreatePracticePage"
import { SessionViewPage } from "@/pages/SessionViewPage"
import { StaffOverviewPage } from "@/pages/StaffOverviewPage"
import { supabase, getUserPractice } from "@/lib/supabase"
import type { PracticeMembership } from "@/lib/supabase"

function App() {
  const [session, setSession] = useState<Session | null>(null)
  const [practice, setPractice] = useState<PracticeMembership | null>(null)
  // loading stays true until BOTH the session check AND the practice check
  // (when applicable) have resolved — prevents any intermediate flash.
  const [loading, setLoading] = useState(true)

  // Fetch practice membership for the given user and store it. Called on
  // initial load and again after CreatePracticePage succeeds.
  async function checkPractice(userId: string) {
    const data = await getUserPractice(userId)
    setPractice(data)
  }

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session)
      if (session) await checkPractice(session.user.id)
      setLoading(false)
    })

    // onAuthStateChange fires on sign-in, sign-out, and token refresh.
    // Re-check practice on every sign-in so the gate stays accurate.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setSession(session)
        if (session) {
          await checkPractice(session.user.id)
        } else {
          setPractice(null)
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  // Hold everything until both checks complete — no flash of wrong screen.
  if (loading) return null

  // Not signed in → auth gate.
  if (!session) return <AuthPage />

  // Signed in but no practice → onboarding.
  if (!practice) {
    return (
      <CreatePracticePage
        userId={session.user.id}
        onPracticeCreated={() => checkPractice(session.user.id)}
      />
    )
  }

  // Signed in and has a practice → full app.
  return (
    <Routes>
      <Route path="/" element={<DashboardPage />} />
      <Route path="/clients/:clientId" element={<ClientOverviewPage />} />
      <Route path="/staff/:staffId" element={<StaffOverviewPage />} />
      <Route path="/session/:sessionId" element={<SessionViewPage />} />
    </Routes>
  )
}

export default App
