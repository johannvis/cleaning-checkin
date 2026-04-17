import { useRef, useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Webcam from 'react-webcam'
import { savePhoto } from '../lib/visits'

export default function BeforePhotosPage() {
  const { id: visitId } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const webcamRef = useRef<Webcam>(null)
  const [photos, setPhotos] = useState<string[]>([])
  const [capturing, setCapturing] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const capture = useCallback(() => {
    const dataUrl = webcamRef.current?.getScreenshot()
    if (dataUrl) {
      setPhotos((prev) => [...prev, dataUrl])
    }
  }, [])

  async function saveAndContinue() {
    if (!visitId) return
    setSaving(true)
    setError('')
    try {
      await Promise.all(photos.map((dataUrl) => savePhoto(visitId, 'before', dataUrl)))
      navigate(`/visit/${visitId}/questions`)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save photos')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="page">
      <h1 style={{ marginBottom: '0.25rem' }}>Before Photos</h1>
      <p className="text-muted" style={{ marginBottom: '1.5rem' }}>
        Capture photos of the site before cleaning
      </p>

      {error && <div className="alert alert-error">{error}</div>}

      {capturing && (
        <div style={{ marginBottom: '1rem' }}>
          <Webcam
            ref={webcamRef}
            screenshotFormat="image/jpeg"
            videoConstraints={{ facingMode: { ideal: 'environment' } }}
            style={{ width: '100%', borderRadius: 'var(--radius)' }}
          />
          <button className="btn btn-primary btn-full mt-4" onClick={capture}>
            📸 Take Photo
          </button>
        </div>
      )}

      {photos.length > 0 && (
        <div style={{ marginBottom: '1rem' }}>
          <h3 style={{ marginBottom: '0.5rem' }}>Captured ({photos.length})</h3>
          <div className="photo-grid">
            {photos.map((url, i) => (
              <div key={i} style={{ position: 'relative' }}>
                <img src={url} alt={`Before photo ${i + 1}`} />
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

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        <button
          className="btn btn-primary btn-full"
          onClick={saveAndContinue}
          disabled={saving || photos.length === 0}
        >
          {saving ? 'Saving…' : `Continue with ${photos.length} photo${photos.length !== 1 ? 's' : ''}`}
        </button>
        {photos.length === 0 && (
          <button
            className="btn btn-outline btn-full"
            onClick={() => navigate(`/visit/${visitId}/questions`)}
          >
            Skip (no photos)
          </button>
        )}
      </div>
    </div>
  )
}
