import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../store/auth'

export default function HistoryPage() {
  const { user } = useAuthStore()

  const { data: visits = [], isLoading } = useQuery({
    queryKey: ['visit-history', user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('visits')
        .select('*, sites(name, address)')
        .eq('cleaner_id', user!.id)
        .order('check_in_at', { ascending: false })
        .limit(50)
      return data ?? []
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
      <h1 style={{ marginBottom: '1.5rem' }}>Visit History</h1>

      {visits.length === 0 ? (
        <div className="card text-center">
          <p className="text-muted">No visits yet. Scan a QR code to check in!</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {visits.map((visit) => (
            <div key={visit.id} className="card">
              <div className="flex justify-between items-center">
                <div>
                  <p style={{ fontWeight: 600 }}>{(visit as any).sites?.name}</p>
                  <p className="text-muted">{(visit as any).sites?.address}</p>
                </div>
                <StatusBadge status={visit.status} />
              </div>
              <div style={{ marginTop: '0.75rem', fontSize: '0.875rem', color: 'var(--gray-600)' }}>
                <p>
                  In: {visit.check_in_at ? new Date(visit.check_in_at).toLocaleString() : '—'}
                </p>
                {visit.check_out_at && (
                  <p>Out: {new Date(visit.check_out_at).toLocaleString()}</p>
                )}
                {!visit.gps_verified && (
                  <p style={{ color: 'var(--yellow)' }}>⚠️ GPS not verified</p>
                )}
              </div>
              {visit.status === 'in_progress' && (
                <div style={{ marginTop: '0.75rem', display: 'flex', gap: '0.5rem' }}>
                  <Link to={`/visit/${visit.id}/checkout`} className="btn btn-success" style={{ fontSize: '0.875rem', padding: '0.5rem 1rem' }}>
                    Check Out
                  </Link>
                  <Link to={`/visit/${visit.id}/questions`} className="btn btn-outline" style={{ fontSize: '0.875rem', padding: '0.5rem 1rem' }}>
                    Questions
                  </Link>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { cls: string; label: string }> = {
    in_progress: { cls: 'badge-yellow', label: 'In Progress' },
    completed: { cls: 'badge-green', label: 'Completed' },
    abandoned: { cls: 'badge-red', label: 'Abandoned' },
  }
  const { cls, label } = map[status] ?? { cls: 'badge-gray', label: status }
  return <span className={`badge ${cls}`}>{label}</span>
}
