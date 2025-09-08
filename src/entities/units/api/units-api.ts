import { supabase } from '@/lib/supabase'

// Mock данные для случая когда Supabase не настроен
const mockUnits: Unit[] = [
  { id: 'mock-unit-1', name: 'штука', short_name: 'шт', description: 'Единица для штучного товара', is_active: true, created_at: '2024-01-01T00:00:00Z', updated_at: '2024-01-01T00:00:00Z' },
  { id: 'mock-unit-2', name: 'метр квадратный', short_name: 'м²', description: 'Единица площади', is_active: true, created_at: '2024-01-01T00:00:00Z', updated_at: '2024-01-01T00:00:00Z' },
  { id: 'mock-unit-3', name: 'метр кубический', short_name: 'м³', description: 'Единица объема', is_active: true, created_at: '2024-01-01T00:00:00Z', updated_at: '2024-01-01T00:00:00Z' },
  { id: 'mock-unit-4', name: 'метр погонный', short_name: 'м.п.', description: 'Единица длины для погонных материалов', is_active: true, created_at: '2024-01-01T00:00:00Z', updated_at: '2024-01-01T00:00:00Z' },
  { id: 'mock-unit-5', name: 'килограмм', short_name: 'кг', description: 'Единица массы', is_active: true, created_at: '2024-01-01T00:00:00Z', updated_at: '2024-01-01T00:00:00Z' },
  { id: 'mock-unit-6', name: 'тонна', short_name: 'т', description: 'Единица массы для больших объемов', is_active: true, created_at: '2024-01-01T00:00:00Z', updated_at: '2024-01-01T00:00:00Z' },
]

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

    console.log('API Request:', {
      table: 'units',
      action: 'select_all',
      mode: 'supabase',
      timestamp: new Date().toISOString(),
      success: !error,
      dataCount: data?.length || 0,
    })

    if (error) {
      console.error('Get all units failed:', error)
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
  },
}
