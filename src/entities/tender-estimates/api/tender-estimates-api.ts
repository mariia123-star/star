import { supabase } from '@/lib/supabase'

export interface TenderEstimate {
  id: string
  materials: string
  works: string
  quantity: number
  unit_id: string
  unit_price?: number
  total_price?: number
  notes?: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface TenderEstimateWithUnit extends TenderEstimate {
  unit_name: string
  unit_short_name: string
}

export interface TenderEstimateCreate {
  materials: string
  works: string
  quantity: number
  unit_id: string
  unit_price?: number
  notes?: string
}

export interface TenderEstimateUpdate {
  materials?: string
  works?: string
  quantity?: number
  unit_id?: string
  unit_price?: number
  notes?: string
  is_active?: boolean
}

export const tenderEstimatesApi = {
  async getAll(): Promise<TenderEstimateWithUnit[]> {
    const { data, error } = await supabase
      .from('v_tender_estimates')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Failed to fetch tender estimates:', error)
      throw error
    }

    return data || []
  },

  async getById(id: string): Promise<TenderEstimate | null> {
    const { data, error } = await supabase
      .from('tender_estimates')
      .select('*')
      .eq('id', id)
      .eq('is_active', true)
      .single()

    if (error) {
      console.error('Failed to fetch tender estimate:', error)
      throw error
    }

    return data
  },

  async create(estimate: TenderEstimateCreate): Promise<TenderEstimate> {
    const { data, error } = await supabase
      .from('tender_estimates')
      .insert(estimate)
      .select()
      .single()

    if (error) {
      console.error('Failed to create tender estimate:', error)
      throw error
    }

    return data
  },

  async update(id: string, estimate: TenderEstimateUpdate): Promise<TenderEstimate> {
    const { data, error } = await supabase
      .from('tender_estimates')
      .update(estimate)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Failed to update tender estimate:', error)
      throw error
    }

    return data
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('tender_estimates')
      .update({ is_active: false })
      .eq('id', id)

    if (error) {
      console.error('Failed to delete tender estimate:', error)
      throw error
    }
  },

  async deleteMany(ids: string[]): Promise<void> {
    const { error } = await supabase
      .from('tender_estimates')
      .update({ is_active: false })
      .in('id', ids)

    if (error) {
      console.error('Failed to delete tender estimates:', error)
      throw error
    }
  }
}