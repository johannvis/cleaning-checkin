import { supabase } from './supabase'
import { db } from './db'

export async function syncPendingData(): Promise<void> {
  if (!navigator.onLine) return

  const [visits, photos, answers] = await Promise.all([
    db.pendingVisits.toArray(),
    db.pendingPhotos.toArray(),
    db.pendingAnswers.toArray(),
  ])

  // Sync visits
  for (const visit of visits) {
    const { error } = await supabase.from('visits').upsert({
      ...visit,
      synced_at: new Date().toISOString(),
    })
    if (!error) {
      await db.pendingVisits.delete(visit.id)
    }
  }

  // Sync photos (upload blob to storage, then insert DB record)
  for (const photo of photos) {
    try {
      // Convert base64 to blob
      const response = await fetch(photo.blob)
      const blob = await response.blob()
      const path = `${photo.visit_id}/${photo.phase}/${photo.id}.jpg`

      const { error: uploadError } = await supabase.storage
        .from('photos')
        .upload(path, blob, { contentType: 'image/jpeg', upsert: true })

      if (uploadError) continue

      const { error: dbError } = await supabase.from('photos').upsert({
        id: photo.id,
        visit_id: photo.visit_id,
        phase: photo.phase,
        storage_path: path,
        captured_at: photo.captured_at,
      })

      if (!dbError) {
        await db.pendingPhotos.delete(photo.id)
      }
    } catch {
      // Skip this photo, retry next sync cycle
    }
  }

  // Sync answers
  for (const answer of answers) {
    const { error } = await supabase.from('answers').upsert(answer)
    if (!error) {
      await db.pendingAnswers.delete(answer.id)
    }
  }
}

/** Register online event listener to auto-sync when connectivity restores */
export function registerSyncListener(): () => void {
  const handler = () => syncPendingData()
  window.addEventListener('online', handler)
  return () => window.removeEventListener('online', handler)
}
