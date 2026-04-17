import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './store/auth'
import { supabase } from './lib/supabase'
import HomePage from './pages/HomePage'
import LoginPage from './pages/LoginPage'
import CheckInPage from './pages/CheckInPage'
import BeforePhotosPage from './pages/BeforePhotosPage'
import QuestionsPage from './pages/QuestionsPage'
import CheckOutPage from './pages/CheckOutPage'
import HistoryPage from './pages/HistoryPage'
import Layout from './components/Layout'

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuthStore()

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <div className="spinner" />
      </div>
    )
  }

  if (!user) {
    // Preserve the current URL so we can redirect back after login
    return <Navigate to={`/login?redirect=${encodeURIComponent(window.location.pathname + window.location.search)}`} replace />
  }

  return <>{children}</>
}

export default function App() {
  const { setAuth, setLoading } = useAuthStore()

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setAuth(session?.user ?? null, session)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setAuth(session?.user ?? null, session)
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [setAuth, setLoading])

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route element={<Layout />}>
          <Route
            path="/"
            element={
              <RequireAuth>
                <HomePage />
              </RequireAuth>
            }
          />
          <Route
            path="/checkin"
            element={
              <RequireAuth>
                <CheckInPage />
              </RequireAuth>
            }
          />
          <Route
            path="/visit/:id/before"
            element={
              <RequireAuth>
                <BeforePhotosPage />
              </RequireAuth>
            }
          />
          <Route
            path="/visit/:id/questions"
            element={
              <RequireAuth>
                <QuestionsPage />
              </RequireAuth>
            }
          />
          <Route
            path="/visit/:id/checkout"
            element={
              <RequireAuth>
                <CheckOutPage />
              </RequireAuth>
            }
          />
          <Route
            path="/history"
            element={
              <RequireAuth>
                <HistoryPage />
              </RequireAuth>
            }
          />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
