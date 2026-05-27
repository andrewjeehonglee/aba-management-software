import { useEffect, useState } from "react"
import { Route, Routes } from "react-router-dom"
import type { Session } from "@supabase/supabase-js"
import { ClientOverviewPage } from "@/pages/ClientOverviewPage"
import { DashboardPage } from "@/pages/DashboardPage"
import { AuthPage } from "@/pages/AuthPage"
import { SessionViewPage } from "@/pages/SessionViewPage"
import { StaffOverviewPage } from "@/pages/StaffOverviewPage"
import { supabase } from "@/lib/supabase"

function App() {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Hydrate session from existing cookie/token on first load.
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setLoading(false)
    })

    // Keep session in sync whenever the user signs in, out, or the token
    // refreshes. The subscription is cleaned up on unmount.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => setSession(session)
    )

    return () => subscription.unsubscribe()
  }, [])

  // Hold rendering until the initial session check resolves so we never
  // flash the auth page to a user who is already signed in.
  if (loading) return null

  if (!session) return <AuthPage />

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
