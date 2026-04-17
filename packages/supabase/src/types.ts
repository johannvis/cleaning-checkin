export type Json = string | number | boolean | null | { [key: string]: Json } | Json[]

export interface Database {
  public: {
    Tables: {
      sites: {
        Row: {
          id: string
          name: string
          address: string
          latitude: number
          longitude: number
          gps_radius_meters: number
          qr_code_url: string | null
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          address: string
          latitude: number
          longitude: number
          gps_radius_meters?: number
          qr_code_url?: string | null
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['sites']['Insert']>
      }
      cleaners: {
        Row: {
          id: string
          full_name: string
          email: string
          active: boolean
          created_at: string
        }
        Insert: {
          id: string
          full_name: string
          email: string
          active?: boolean
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['cleaners']['Insert']>
      }
      visits: {
        Row: {
          id: string
          site_id: string
          cleaner_id: string
          check_in_at: string | null
          check_out_at: string | null
          check_in_lat: number | null
          check_in_lng: number | null
          check_out_lat: number | null
          check_out_lng: number | null
          gps_verified: boolean
          status: 'in_progress' | 'completed' | 'abandoned'
          synced_at: string | null
        }
        Insert: {
          id?: string
          site_id: string
          cleaner_id: string
          check_in_at?: string | null
          check_out_at?: string | null
          check_in_lat?: number | null
          check_in_lng?: number | null
          check_out_lat?: number | null
          check_out_lng?: number | null
          gps_verified?: boolean
          status?: 'in_progress' | 'completed' | 'abandoned'
          synced_at?: string | null
        }
        Update: Partial<Database['public']['Tables']['visits']['Insert']>
      }
      photos: {
        Row: {
          id: string
          visit_id: string
          phase: 'before' | 'after'
          storage_path: string
          captured_at: string
        }
        Insert: {
          id?: string
          visit_id: string
          phase: 'before' | 'after'
          storage_path: string
          captured_at?: string
        }
        Update: Partial<Database['public']['Tables']['photos']['Insert']>
      }
      questions: {
        Row: {
          id: string
          site_id: string | null
          label: string
          type: 'yesno' | 'text' | 'rating' | 'select'
          options: Json | null
          sort_order: number
          active: boolean
        }
        Insert: {
          id?: string
          site_id?: string | null
          label: string
          type: 'yesno' | 'text' | 'rating' | 'select'
          options?: Json | null
          sort_order?: number
          active?: boolean
        }
        Update: Partial<Database['public']['Tables']['questions']['Insert']>
      }
      answers: {
        Row: {
          id: string
          visit_id: string
          question_id: string
          value: string
          answered_at: string
        }
        Insert: {
          id?: string
          visit_id: string
          question_id: string
          value: string
          answered_at?: string
        }
        Update: Partial<Database['public']['Tables']['answers']['Insert']>
      }
    }
  }
}

// Convenience types
export type Site = Database['public']['Tables']['sites']['Row']
export type Cleaner = Database['public']['Tables']['cleaners']['Row']
export type Visit = Database['public']['Tables']['visits']['Row']
export type Photo = Database['public']['Tables']['photos']['Row']
export type Question = Database['public']['Tables']['questions']['Row']
export type Answer = Database['public']['Tables']['answers']['Row']
