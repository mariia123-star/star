import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase environment variables not found. Using mock data.')
} else {
  console.log('Supabase connected:', {
    url: supabaseUrl,
    hasKey: !!supabaseAnonKey,
    timestamp: new Date().toISOString(),
  })
}

export const supabase =
  supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
        },
        realtime: {
          params: {
            eventsPerSecond: 10,
          },
        },
      })
    : null

export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          full_name: string
          email: string
          role: string
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          full_name: string
          email: string
          role: string
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          full_name?: string
          email?: string
          role?: string
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      projects: {
        Row: {
          id: string
          name: string
          description: string | null
          start_date: string | null
          end_date: string | null
          status: string
          budget: number | null
          responsible_person: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          start_date?: string | null
          end_date?: string | null
          status?: string
          budget?: number | null
          responsible_person?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          start_date?: string | null
          end_date?: string | null
          status?: string
          budget?: number | null
          responsible_person?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
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
      materials: {
        Row: {
          id: string
          code: string
          name: string
          description: string | null
          category: string
          unit_id: string
          last_purchase_price: number | null
          supplier: string | null
          supplier_article: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          code: string
          name: string
          description?: string | null
          category: string
          unit_id: string
          last_purchase_price?: number | null
          supplier?: string | null
          supplier_article?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          code?: string
          name?: string
          description?: string | null
          category?: string
          unit_id?: string
          last_purchase_price?: number | null
          supplier?: string | null
          supplier_article?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      material_types: {
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
          project_id: string | null
          material_type_id: string | null
          customer: string | null
          row_name: string
          work_name: string
          unit_id: string
          volume: number
          material_consumption_ratio: number | null
          work_price: number | null
          material_price_with_vat: number | null
          delivery_price: number | null
          total_price: number | null
          notes: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          project_id?: string | null
          material_type_id?: string | null
          customer?: string | null
          row_name: string
          work_name: string
          unit_id: string
          volume: number
          material_consumption_ratio?: number | null
          work_price?: number | null
          material_price_with_vat?: number | null
          delivery_price?: number | null
          total_price?: number | null
          notes?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          project_id?: string | null
          material_type_id?: string | null
          customer?: string | null
          row_name?: string
          work_name?: string
          unit_id?: string
          volume?: number
          material_consumption_ratio?: number | null
          work_price?: number | null
          material_price_with_vat?: number | null
          delivery_price?: number | null
          total_price?: number | null
          notes?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      rates: {
        Row: {
          id: string
          code: string
          name: string
          description: string | null
          unit_id: string
          base_price: number
          category: string
          subcategory: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          code: string
          name: string
          description?: string | null
          unit_id: string
          base_price: number
          category: string
          subcategory?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          code?: string
          name?: string
          description?: string | null
          unit_id?: string
          base_price?: number
          category?: string
          subcategory?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      rate_materials_mapping: {
        Row: {
          id: string
          rate_id: string
          material_id: string
          consumption: number
          unit_price: number
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          rate_id: string
          material_id: string
          consumption: number
          unit_price?: number
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          rate_id?: string
          material_id?: string
          consumption?: number
          unit_price?: number
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      object_estimates: {
        Row: {
          id: string
          project_id: string | null
          object_name: string
          materials: string
          works: string
          quantity: number
          unit_id: string
          unit_price: number | null
          total_price: number | null
          fact_quantity: number | null
          fact_price: number | null
          completion_date: string | null
          notes: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          project_id?: string | null
          object_name: string
          materials: string
          works: string
          quantity: number
          unit_id: string
          unit_price?: number | null
          total_price?: number | null
          fact_quantity?: number | null
          fact_price?: number | null
          completion_date?: string | null
          notes?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          project_id?: string | null
          object_name?: string
          materials?: string
          works?: string
          quantity?: number
          unit_id?: string
          unit_price?: number | null
          total_price?: number | null
          fact_quantity?: number | null
          fact_price?: number | null
          completion_date?: string | null
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
          project_id: string | null
          project_name: string | null
          material_type_id: string | null
          material_type_name: string | null
          customer: string | null
          row_name: string
          work_name: string
          unit_id: string
          unit_name: string
          unit_short_name: string
          volume: number
          material_consumption_ratio: number | null
          work_price: number | null
          material_price_with_vat: number | null
          delivery_price: number | null
          total_price: number | null
          notes: string | null
          created_at: string
          updated_at: string
        }
      }
      v_object_estimates: {
        Row: {
          id: string
          project_id: string | null
          project_name: string | null
          object_name: string
          materials: string
          works: string
          quantity: number
          unit_name: string
          unit_short_name: string
          unit_price: number | null
          total_price: number | null
          fact_quantity: number | null
          fact_price: number | null
          completion_date: string | null
          notes: string | null
          created_at: string
          updated_at: string
        }
      }
    }
  }
}
