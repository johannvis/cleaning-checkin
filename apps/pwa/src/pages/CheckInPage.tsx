import { useEffect, useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../store/auth'
import { getCurrentPosition, distanceMeters } from '../lib/gps'
import { createVisit } from '../lib/visits'
import type { Site } from '@cleaning/supabase'

export default function CheckInPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const siteId = searchParams.get('site')

  const [gpsStatus, setGpsStatus] = useState<'checking' | 'ok' | 'warning' | 'error'>('checking')
  const [gpsDistance, setGpsDistance] = useState<number | null>(null)
  const [checkedIn, setCheckedIn] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const { data: site, isLoading: siteLoading } = useQuery<Site>({
    queryKey: ['site', siteId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sites')
        .select('*')
        .eq('id', siteId!)
        .single()
      if (error) throw error
      return data
    },
    enabled: !!siteId,
  })

  useEffect(() => {
    if (!site) return

    getCurrentPosition()
      .then((pos) => {
        const dist = distanceMeters(
          pos.coords.latitude,
          pos.coords.longitude,
          site.latitude,
          site.longitude
        )
        setGpsDistance(Math.round(dist))
        setGpsStatus(dist <= site.gps_radius_meters ? 'ok' : 'warning')
      })
      .catch(() => setGpsStatus('error'))
  }, [site])

  async function handleCheckIn() {
    if (!site || !user) return
    setLoading(true)
    setError('')

    try {
      let lat: number | null = null
      let lng: number | null = null
      let gpsVerified = false

      try {
        const pos = await getCurrentPosition()
        lat = pos.coords.latitude
        lng = pos.coords.longitude
        const dist = distanceMeters(lat, lng, site.latitude, site.longitude)
        gpsVerified = dist <= site.gps_radius_meters
      } catch {
        // GPS unavailable — proceed anyway
      }

      const visitId = await createVisit(site, user.id, lat, lng, gpsVerified)
      navigate(`/visit/${visitId}/before`)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Check-in failed')
    } finally {
      setLoading(false)
    }
  }

  if (!siteId) {
    return (
      <div className="page">
        <div className="card text-center">
          <p style={{ fontSize: '2rem', marginBottom: '1rem' }}>❌</p>
          <h2>Invalid QR code</h2>
          <p className="text-muted mt-2">This QR code doesn't contain a valid site ID.</p>
        </div>
      </div>
    )
  }

  if (siteLoading) {
    return (
      <div className="page" style={{ display: 'flex', justifyContent: 'center', paddingTop: '4rem' }}>
        <div className="spinner" />
      </div>
    )
  }

  if (!site) {
    return (
      <div className="page">
        <div className="card text-center">
          <p style={{ fontSize: '2rem', marginBottom: '1rem' }}>❌</p>
          <h2>Site not found</h2>
          <p className="text-muted mt-2">This site doesn't exist or has been removed.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="page">
      <div className="card">
        <h1 style={{ marginBottom: '0.25rem' }}>{site.name}</h1>
        <p className="text-muted" style={{ marginBottom: '1.5rem' }}>{site.address}</p>

        {/* GPS status */}
        {gpsStatus === 'checking' && (
          <div className="alert alert-warn">
            📍 Checking your location…
          </div>
        )}
        {gpsStatus === 'ok' && (
          <div className="alert alert-success">
            ✅ You're at the right location ({gpsDistance}m away)
          </div>
        )}
        {gpsStatus === 'warning' && (
          <div className="alert alert-warn">
            ⚠️ You appear to be {gpsDistance}m from this site (allowed: {site.gps_radius_meters}m).
            You can still check in but the owner will be notified.
          </div>
        )}
        {gpsStatus === 'error' && (
          <div className="alert alert-warn">
            ⚠️ Unable to get your location. Check-in will proceed but GPS won't be verified.
          </div>
        )}

        {error && <div className="alert alert-error">{error}</div>}

        {!checkedIn && (
          <button
            className="btn btn-primary btn-full mt-4"
            onClick={handleCheckIn}
            disabled={loading}
          >
            {loading ? 'Checking in…' : 'Check In'}
          </button>
        )}
      </div>
    </div>
  )
}
