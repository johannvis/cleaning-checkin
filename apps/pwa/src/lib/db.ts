import Dexie, { type Table } from 'dexie'

export interface PendingVisit {
  id: string
  site_id: string
  cleaner_id: string
  check_in_at: string
  check_in_lat: number | null
  check_in_lng: number | null
  gps_verified: boolean
  status: 'in_progress' | 'completed' | 'abandoned'
  check_out_at?: string | null
  check_out_lat?: number | null
  check_out_lng?: number | null
}

export interface PendingPhoto {
  id: string
  visit_id: string
  phase: 'before' | 'after'
  blob: string // base64 data URL
  captured_at: string
}

export interface PendingAnswer {
  id: string
  visit_id: string
  question_id: string
  value: string
  answered_at: string
}

class CleaningDB extends Dexie {
  pendingVisits!: Table<PendingVisit>
  pendingPhotos!: Table<PendingPhoto>
  pendingAnswers!: Table<PendingAnswer>

  constructor() {
    super('cleaning-checkin')
    this.version(1).stores({
      pendingVisits: 'id, site_id, cleaner_id, status',
      pendingPhotos: 'id, visit_id, phase',
      pendingAnswers: 'id, visit_id, question_id',
    })
  }
}

export const db = new CleaningDB()
