import { useEffect } from "react"
import { Route, Routes } from "react-router-dom"
import { ClientOverviewPage } from "@/pages/ClientOverviewPage"
import { DashboardPage } from "@/pages/DashboardPage"
import { SessionViewPage } from "@/pages/SessionViewPage"
import { StaffOverviewPage } from "@/pages/StaffOverviewPage"
import { supabase } from "@/lib/supabase"

function App() {
  useEffect(() => {
    supabase
      .from("practices")
      .select("count")
      .then(({ data, error }) => {
        console.log("[Supabase smoke test] data:", data, "error:", error)
      })
  }, [])

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
