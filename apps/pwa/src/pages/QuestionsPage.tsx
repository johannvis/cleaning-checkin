import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { saveAnswer } from '../lib/visits'
import type { Question } from '@cleaning/supabase'

type Answers = Record<string, string>

export default function QuestionsPage() {
  const { id: visitId } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [answers, setAnswers] = useState<Answers>({})
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // Load active visit to get site_id
  const { data: visit } = useQuery({
    queryKey: ['visit', visitId],
    queryFn: async () => {
      const { data } = await supabase
        .from('visits')
        .select('site_id')
        .eq('id', visitId!)
        .single()
      return data
    },
    enabled: !!visitId,
  })

  const { data: questions = [], isLoading } = useQuery<Question[]>({
    queryKey: ['questions', visit?.site_id],
    queryFn: async () => {
      const { data } = await supabase
        .from('questions')
        .select('*')
        .or(`site_id.is.null,site_id.eq.${visit!.site_id}`)
        .eq('active', true)
        .order('sort_order')
      return data ?? []
    },
    enabled: !!visit?.site_id,
  })

  function setAnswer(questionId: string, value: string) {
    setAnswers((prev) => ({ ...prev, [questionId]: value }))
  }

  async function handleSubmit() {
    if (!visitId) return
    setSaving(true)
    setError('')
    try {
      await Promise.all(
        Object.entries(answers).map(([questionId, value]) =>
          saveAnswer(visitId, questionId, value)
        )
      )
      navigate(`/visit/${visitId}/checkout`)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save answers')
    } finally {
      setSaving(false)
    }
  }

  if (isLoading) {
    return (
      <div className="page" style={{ display: 'flex', justifyContent: 'center', paddingTop: '4rem' }}>
        <div className="spinner" />
      </div>
    )
  }

  return (
    <div className="page">
      <h1 style={{ marginBottom: '0.25rem' }}>Questionnaire</h1>
      <p className="text-muted" style={{ marginBottom: '1.5rem' }}>
        Please answer the following questions
      </p>

      {error && <div className="alert alert-error">{error}</div>}

      {questions.length === 0 ? (
        <div className="card text-center">
          <p className="text-muted">No questions configured for this site.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {questions.map((q, index) => (
            <div key={q.id} className="card">
              <label className="label" htmlFor={`q-${q.id}`}>
                {index + 1}. {q.label}
              </label>
              <QuestionInput
                question={q}
                value={answers[q.id] ?? ''}
                onChange={(v) => setAnswer(q.id, v)}
              />
            </div>
          ))}
        </div>
      )}

      <div style={{ marginTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        <button
          className="btn btn-primary btn-full"
          onClick={handleSubmit}
          disabled={saving}
        >
          {saving ? 'Saving…' : 'Continue to Check-Out'}
        </button>
        <button
          className="btn btn-outline btn-full"
          onClick={() => navigate(`/visit/${visitId}/checkout`)}
        >
          Skip questionnaire
        </button>
      </div>
    </div>
  )
}

function QuestionInput({
  question,
  value,
  onChange,
}: {
  question: Question
  value: string
  onChange: (v: string) => void
}) {
  if (question.type === 'yesno') {
    return (
      <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
        {['Yes', 'No'].map((opt) => (
          <button
            key={opt}
            className={`btn ${value === opt ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => onChange(opt)}
            style={{ flex: 1 }}
          >
            {opt}
          </button>
        ))}
      </div>
    )
  }

  if (question.type === 'rating') {
    return (
      <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            className={`btn ${value === String(n) ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => onChange(String(n))}
            style={{ flex: 1, padding: '0.5rem' }}
          >
            {n}
          </button>
        ))}
      </div>
    )
  }

  if (question.type === 'select') {
    const options: string[] = Array.isArray(question.options) ? question.options as string[] : []
    return (
      <select
        id={`q-${question.id}`}
        className="input"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{ marginTop: '0.5rem' }}
      >
        <option value="">Select an option…</option>
        {options.map((opt) => (
          <option key={opt} value={opt}>{opt}</option>
        ))}
      </select>
    )
  }

  // text
  return (
    <textarea
      id={`q-${question.id}`}
      className="input"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      rows={3}
      placeholder="Your answer…"
      style={{ marginTop: '0.5rem', resize: 'vertical' }}
    />
  )
}
