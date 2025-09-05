import { supabase } from '@/lib/supabase'

export interface Unit {
  id: string
  name: string
  short_name: string
  description?: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface UnitCreate {
  name: string
  short_name: string
  description?: string
  is_active?: boolean
}

export interface UnitUpdate {
  name?: string
  short_name?: string
  description?: string
  is_active?: boolean
}

export const unitsApi = {
  async getAll(): Promise<Unit[]> {
    const { data, error } = await supabase
      .from('units')
      .select('*')
      .eq('is_active', true)
      .order('name', { ascending: true })

    if (error) {
      console.error('Failed to fetch units:', error)
      throw error
    }

    return data || []
  },

  async getById(id: string): Promise<Unit | null> {
    const { data, error } = await supabase
      .from('units')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      console.error('Failed to fetch unit:', error)
      throw error
    }

    return data
  },

  async create(unit: UnitCreate): Promise<Unit> {
    const { data, error } = await supabase
      .from('units')
      .insert(unit)
      .select()
      .single()

    if (error) {
      console.error('Failed to create unit:', error)
      throw error
    }

    return data
  },

  async update(id: string, unit: UnitUpdate): Promise<Unit> {
    const { data, error } = await supabase
      .from('units')
      .update(unit)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Failed to update unit:', error)
      throw error
    }

    return data
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('units')
      .update({ is_active: false })
      .eq('id', id)

    if (error) {
      console.error('Failed to delete unit:', error)
      throw error
    }
  },

  async getActive(): Promise<Unit[]> {
    return this.getAll()
  }
}