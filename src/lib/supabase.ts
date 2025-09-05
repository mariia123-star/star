import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase environment variables not found. Using mock data.')
}

export const supabase = supabaseUrl && supabaseAnonKey 
  ? createClient(supabaseUrl, supabaseAnonKey, {
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
  : null

export type Database = {
  public: {
    Tables: {
      units: {
        Row: {
          id: string
          name: string
          short_name: string
          description: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          short_name: string
          description?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          short_name?: string
          description?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      tender_estimates: {
        Row: {
          id: string
          materials: string
          works: string
          quantity: number
          unit_id: string
          unit_price: number | null
          total_price: number | null
          notes: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          materials: string
          works: string
          quantity: number
          unit_id: string
          unit_price?: number | null
          total_price?: number | null
          notes?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          materials?: string
          works?: string
          quantity?: number
          unit_id?: string
          unit_price?: number | null
          total_price?: number | null
          notes?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
    }
    Views: {
      v_tender_estimates: {
        Row: {
          id: string
          materials: string
          works: string
          quantity: number
          unit_name: string
          unit_short_name: string
          unit_price: number | null
          total_price: number | null
          notes: string | null
          created_at: string
          updated_at: string
        }
      }
    }
  }
}