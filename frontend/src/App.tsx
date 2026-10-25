import { Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from './components/AppShell'
import { AccuracyPage } from './pages/AccuracyPage'
import { MethodPage } from './pages/MethodPage'
import { WorkspacePage } from './pages/WorkspacePage'

export default function App() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<Navigate replace to="/decision" />} />
        <Route element={<WorkspacePage />} path="/decision" />
        <Route element={<AccuracyPage />} path="/accuracy" />
        <Route element={<MethodPage />} path="/method" />
        <Route element={<Navigate replace to="/decision" />} path="*" />
      </Route>
    </Routes>
  )
}
