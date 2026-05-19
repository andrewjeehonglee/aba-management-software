import { Route, Routes } from "react-router-dom"
import { ClientOverviewPage } from "@/pages/ClientOverviewPage"
import { DashboardPage } from "@/pages/DashboardPage"
import { SessionViewPage } from "@/pages/SessionViewPage"
import { StaffOverviewPage } from "@/pages/StaffOverviewPage"

function App() {
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
