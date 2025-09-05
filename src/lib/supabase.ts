import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  },
  realtime: {
    params: {
      eventsPerSecond: 10
    }
  }
})

export type Database = {
  public: {
    Tables: {
      chessboard: {
        Row: {
          id: string
          material: string | null
          quantity: number | null
          unit: string | null
          project_id: string | null
          block_id: string | null
          cost_category_id: string | null
          cost_type_id: string | null
          location_id: string | null
          row_color: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          material?: string | null
          quantity?: number | null
          unit?: string | null
          project_id?: string | null
          block_id?: string | null
          cost_category_id?: string | null
          cost_type_id?: string | null
          location_id?: string | null
          row_color?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          material?: string | null
          quantity?: number | null
          unit?: string | null
          project_id?: string | null
          block_id?: string | null
          cost_category_id?: string | null
          cost_type_id?: string | null
          location_id?: string | null
          row_color?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      projects: {
        Row: {
          id: string
          name: string
          description: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      blocks: {
        Row: {
          id: string
          name: string
          project_id: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          project_id: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          project_id?: string
          created_at?: string
          updated_at?: string
        }
      }
    }
  }
}