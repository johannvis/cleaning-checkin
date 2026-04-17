import { v4 as uuidv4 } from 'uuid'
import { supabase } from './supabase'
import { db } from './db'
import type { Site } from '@cleaning/supabase'

export async function createVisit(
  site: Site,
  cleanerId: string,
  lat: number | null,
  lng: number | null,
  gpsVerified: boolean
): Promise<string> {
  const id = uuidv4()
  const now = new Date().toISOString()

  const visitData = {
    id,
    site_id: site.id,
    cleaner_id: cleanerId,
    check_in_at: now,
    check_in_lat: lat,
    check_in_lng: lng,
    gps_verified: gpsVerified,
    status: 'in_progress' as const,
    synced_at: null,
  }

  if (navigator.onLine) {
    const { error } = await supabase.from('visits').insert({
      ...visitData,
      synced_at: now,
    })
    if (error) {
      // Fall back to offline queue
      await db.pendingVisits.add(visitData)
    }
  } else {
    await db.pendingVisits.add(visitData)
  }

  return id
}

export async function checkOutVisit(
  visitId: string,
  lat: number | null,
  lng: number | null
): Promise<void> {
  const now = new Date().toISOString()
  const update = {
    check_out_at: now,
    check_out_lat: lat,
    check_out_lng: lng,
    status: 'completed' as const,
  }

  if (navigator.onLine) {
    const { error } = await supabase
      .from('visits')
      .update({ ...update, synced_at: now })
      .eq('id', visitId)

    if (error) {
      await db.pendingVisits.update(visitId, update)
    }
  } else {
    await db.pendingVisits.update(visitId, update)
  }
}

export async function savePhoto(
  visitId: string,
  phase: 'before' | 'after',
  dataUrl: string
): Promise<string> {
  const id = uuidv4()
  const now = new Date().toISOString()

  if (navigator.onLine) {
    try {
      const response = await fetch(dataUrl)
      const blob = await response.blob()
      const path = `${visitId}/${phase}/${id}.jpg`

      const { error: uploadError } = await supabase.storage
        .from('photos')
        .upload(path, blob, { contentType: 'image/jpeg' })

      if (!uploadError) {
        await supabase.from('photos').insert({
          id,
          visit_id: visitId,
          phase,
          storage_path: path,
          captured_at: now,
        })
        return id
      }
    } catch {
      // Fall through to offline queue
    }
  }

  await db.pendingPhotos.add({
    id,
    visit_id: visitId,
    phase,
    blob: dataUrl,
    captured_at: now,
  })
  return id
}

export async function saveAnswer(
  visitId: string,
  questionId: string,
  value: string
): Promise<void> {
  const id = uuidv4()
  const now = new Date().toISOString()

  const answerData = { id, visit_id: visitId, question_id: questionId, value, answered_at: now }

  if (navigator.onLine) {
    const { error } = await supabase.from('answers').insert(answerData)
    if (error) {
      await db.pendingAnswers.add(answerData)
    }
  } else {
    await db.pendingAnswers.add(answerData)
  }
}
