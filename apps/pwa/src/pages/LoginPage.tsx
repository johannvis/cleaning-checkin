import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../store/auth'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState('')
  const [step, setStep] = useState<'email' | 'otp'>('email')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const redirect = searchParams.get('redirect') || '/'

  // Already logged in
  useEffect(() => {
    if (user) navigate(redirect, { replace: true })
  }, [user, navigate, redirect])

  async function sendOtp() {
    setError('')
    setLoading(true)
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: true },
    })
    setLoading(false)
    if (error) {
      setError(error.message)
    } else {
      setStep('otp')
    }
  }

  async function verifyOtp() {
    setError('')
    setLoading(true)
    const { error } = await supabase.auth.verifyOtp({
      email,
      token: otp,
      type: 'email',
    })
    setLoading(false)
    if (error) {
      setError(error.message)
    }
    // auth state change handled in App.tsx → will redirect
  }

  return (
    <div className="page" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', minHeight: '100vh' }}>
      <div className="card">
        <h1 className="text-center mb-4">🧹 Cleaning Check-In</h1>
        <p className="text-muted text-center" style={{ marginBottom: '1.5rem' }}>
          Sign in with your email to get started
        </p>

        {error && <div className="alert alert-error">{error}</div>}

        {step === 'email' ? (
          <>
            <div className="form-group">
              <label className="label" htmlFor="email">Email address</label>
              <input
                id="email"
                type="email"
                className="input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                onKeyDown={(e) => e.key === 'Enter' && sendOtp()}
              />
            </div>
            <button
              className="btn btn-primary btn-full"
              onClick={sendOtp}
              disabled={loading || !email}
            >
              {loading ? 'Sending…' : 'Send one-time code'}
            </button>
          </>
        ) : (
          <>
            <p className="text-muted" style={{ marginBottom: '1rem' }}>
              We sent a 6-digit code to <strong>{email}</strong>
            </p>
            <div className="form-group">
              <label className="label" htmlFor="otp">One-time code</label>
              <input
                id="otp"
                type="text"
                inputMode="numeric"
                className="input"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="123456"
                onKeyDown={(e) => e.key === 'Enter' && verifyOtp()}
              />
            </div>
            <button
              className="btn btn-primary btn-full"
              onClick={verifyOtp}
              disabled={loading || otp.length < 6}
            >
              {loading ? 'Verifying…' : 'Verify & sign in'}
            </button>
            <button
              className="btn btn-outline btn-full mt-2"
              onClick={() => { setStep('email'); setOtp(''); setError('') }}
              style={{ marginTop: '0.75rem' }}
            >
              Use a different email
            </button>
          </>
        )}
      </div>
    </div>
  )
}
