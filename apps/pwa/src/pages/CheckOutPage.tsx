import { useRef, useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Webcam from 'react-webcam'
import { checkOutVisit, savePhoto } from '../lib/visits'
import { getCurrentPosition } from '../lib/gps'
import { useQueryClient } from '@tanstack/react-query'

export default function CheckOutPage() {
  const { id: visitId } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const webcamRef = useRef<Webcam>(null)
  const [photos, setPhotos] = useState<string[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const capture = useCallback(() => {
    const dataUrl = webcamRef.current?.getScreenshot()
    if (dataUrl) setPhotos((prev) => [...prev, dataUrl])
  }, [])

  async function handleCheckOut() {
    if (!visitId) return
    setSaving(true)
    setError('')
    try {
      // Save after photos
      await Promise.all(photos.map((dataUrl) => savePhoto(visitId, 'after', dataUrl)))

      // Get GPS
      let lat: number | null = null
      let lng: number | null = null
      try {
        const pos = await getCurrentPosition()
        lat = pos.coords.latitude
        lng = pos.coords.longitude
      } catch {
        // GPS unavailable
      }

      await checkOutVisit(visitId, lat, lng)
      queryClient.invalidateQueries({ queryKey: ['active-visit'] })
      navigate('/')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Check-out failed')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="page">
      <h1 style={{ marginBottom: '0.25rem' }}>Check Out</h1>
      <p className="text-muted" style={{ marginBottom: '1.5rem' }}>
        Take after photos, then complete your visit
      </p>

      {error && <div className="alert alert-error">{error}</div>}

      <div style={{ marginBottom: '1rem' }}>
        <Webcam
          ref={webcamRef}
          screenshotFormat="image/jpeg"
          videoConstraints={{ facingMode: { ideal: 'environment' } }}
          style={{ width: '100%', borderRadius: 'var(--radius)' }}
        />
        <button className="btn btn-primary btn-full mt-4" onClick={capture}>
          📸 Take After Photo
        </button>
      </div>

      {photos.length > 0 && (
        <div style={{ marginBottom: '1rem' }}>
          <h3 style={{ marginBottom: '0.5rem' }}>After Photos ({photos.length})</h3>
          <div className="photo-grid">
            {photos.map((url, i) => (
              <div key={i} style={{ position: 'relative' }}>
                <img src={url} alt={`After photo ${i + 1}`} />
                <button
                  onClick={() => setPhotos((prev) => prev.filter((_, idx) => idx !== i))}
                  style={{
                    position: 'absolute',
                    top: '2px',
                    right: '2px',
                    background: 'rgba(0,0,0,0.6)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '50%',
                    width: '20px',
                    height: '20px',
                    cursor: 'pointer',
                    fontSize: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <button
        className="btn btn-success btn-full"
        onClick={handleCheckOut}
        disabled={saving}
        style={{ marginTop: '1rem' }}
      >
        {saving ? 'Saving…' : '✅ Complete Visit & Check Out'}
      </button>
    </div>
  )
}
