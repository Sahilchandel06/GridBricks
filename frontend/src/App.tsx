import { Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from './components/AppShell'
import { SectionPlaceholder } from './pages/SectionPlaceholder'
import { WorkspacePage } from './pages/WorkspacePage'

export default function App() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<Navigate replace to="/decision" />} />
        <Route element={<WorkspacePage />} path="/decision" />
        <Route element={<SectionPlaceholder section="accuracy" />} path="/accuracy" />
        <Route element={<SectionPlaceholder section="method" />} path="/method" />
        <Route element={<Navigate replace to="/decision" />} path="*" />
      </Route>
    </Routes>
  )
}
