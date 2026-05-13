import { Route, Routes } from "react-router-dom"
import { ClientOverviewPage } from "@/pages/ClientOverviewPage"
import { DashboardPage } from "@/pages/DashboardPage"

function App() {
  return (
    <Routes>
      <Route path="/" element={<DashboardPage />} />
      <Route path="/clients/:clientId" element={<ClientOverviewPage />} />
    </Routes>
  )
}

export default App
