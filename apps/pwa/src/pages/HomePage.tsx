import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../store/auth'

export default function HomePage() {
  const { user } = useAuthStore()

  const { data: activeVisit, isLoading } = useQuery({
    queryKey: ['active-visit', user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('visits')
        .select('*, sites(name, address)')
        .eq('cleaner_id', user!.id)
        .eq('status', 'in_progress')
        .order('check_in_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      return data
    },
    enabled: !!user,
  })

  if (isLoading) {
    return (
      <div className="page" style={{ display: 'flex', justifyContent: 'center', paddingTop: '4rem' }}>
        <div className="spinner" />
      </div>
    )
  }

  return (
    <div className="page">
      <h1 style={{ marginBottom: '0.5rem' }}>Hello 👋</h1>
      <p className="text-muted" style={{ marginBottom: '1.5rem' }}>
        {user?.email}
      </p>

      {activeVisit ? (
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2>Active Visit</h2>
            <span className="badge badge-green">In Progress</span>
          </div>
          <p style={{ fontWeight: 600 }}>{(activeVisit as any).sites?.name}</p>
          <p className="text-muted">{(activeVisit as any).sites?.address}</p>
          <p className="text-muted mt-1">
            Started: {new Date(activeVisit.check_in_at!).toLocaleTimeString()}
          </p>
          {!activeVisit.gps_verified && (
            <div className="alert alert-warn mt-4">
              GPS not verified — please check your location.
            </div>
          )}
          <div style={{ marginTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <Link to={`/visit/${activeVisit.id}/before`} className="btn btn-outline btn-full">
              Before Photos
            </Link>
            <Link to={`/visit/${activeVisit.id}/questions`} className="btn btn-outline btn-full">
              Questionnaire
            </Link>
            <Link to={`/visit/${activeVisit.id}/checkout`} className="btn btn-success btn-full">
              Check Out
            </Link>
          </div>
        </div>
      ) : (
        <div className="card text-center">
          <p style={{ fontSize: '3rem', marginBottom: '1rem' }}>📷</p>
          <h2 style={{ marginBottom: '0.5rem' }}>No active visit</h2>
          <p className="text-muted" style={{ marginBottom: '1.5rem' }}>
            Scan the QR code at your site to check in and start a new visit.
          </p>
          <Link to="/history" className="btn btn-outline">
            View history
          </Link>
        </div>
      )}
    </div>
  )
}
