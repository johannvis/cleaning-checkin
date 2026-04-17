import { Outlet, Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../store/auth'

export default function Layout() {
  const { user } = useAuthStore()
  const navigate = useNavigate()

  async function handleSignOut() {
    await supabase.auth.signOut()
    navigate('/login')
  }

  return (
    <>
      <nav className="nav">
        <Link to="/" className="nav-title" style={{ textDecoration: 'none', color: 'inherit' }}>
          🧹 Check-In
        </Link>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <Link to="/history" style={{ fontSize: '0.875rem', color: 'var(--blue)' }}>
            History
          </Link>
          {user && (
            <button
              onClick={handleSignOut}
              style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.875rem', color: 'var(--gray-600)' }}
            >
              Sign out
            </button>
          )}
        </div>
      </nav>
      <Outlet />
    </>
  )
}
