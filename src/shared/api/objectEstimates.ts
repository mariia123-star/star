import { supabase } from '../../lib/supabase'

export interface ObjectEstimate {
  id: string
  project_id?: string | null
  project_name?: string | null
  object_name: string
  materials: string
  works: string
  quantity: number
  unit_id: string
  unit_price: number
  total_price: number
  fact_quantity: number
  fact_price: number
  completion_date?: string
  notes?: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface CreateObjectEstimateData {
  project_id?: string | null
  object_name: string
  materials: string
  works: string
  quantity: number
  unit_id: string
  unit_price?: number
  fact_quantity?: number
  fact_price?: number
  completion_date?: string
  notes?: string
}

export interface UpdateObjectEstimateData {
  project_id?: string | null
  object_name?: string
  materials?: string
  works?: string
  quantity?: number
  unit_id?: string
  unit_price?: number
  fact_quantity?: number
  fact_price?: number
  completion_date?: string
  notes?: string
  is_active?: boolean
}

console.log('API Request:', {
  table: 'object_estimates',
  action: 'init',
  timestamp: new Date().toISOString(),
})

export const objectEstimatesApi = {
  // Получить все сметы по объектам
  async getAll(projectId?: string | null): Promise<ObjectEstimate[]> {
    console.log('API Request:', {
      table: 'v_object_estimates',
      action: 'select_all',
      projectId,
      timestamp: new Date().toISOString(),
    })

    if (!supabase) {
      console.error('Supabase client not initialized')
      throw new Error('Supabase client not initialized')
    }

    let query = supabase
      .from('v_object_estimates')
      .select('*')
      .order('created_at', { ascending: false })

    if (projectId) {
      query = query.eq('project_id', projectId)
    }

    const { data, error } = await query

    console.log('API Request result:', {
      success: !error,
      dataCount: data?.length || 0,
    })

    if (error) {
      console.error('Error fetching object estimates:', error)
      throw error
    }

    return data || []
  },

  // Получить смету по объекту по ID
  async getById(id: string): Promise<ObjectEstimate> {
    console.log('API Request:', {
      table: 'object_estimates',
      action: 'select_by_id',
      timestamp: new Date().toISOString(),
      id,
    })

    if (!supabase) {
      console.error('Supabase client not initialized')
      throw new Error('Supabase client not initialized')
    }

    const { data, error } = await supabase
      .from('object_estimates')
      .select('*')
      .eq('id', id)
      .single()

    console.log('API Request:', {
      table: 'object_estimates',
      action: 'select_by_id',
      timestamp: new Date().toISOString(),
      success: !error,
      id,
    })

    if (error) {
      console.error('Error fetching object estimate:', error)
      throw error
    }

    return data
  },

  // Создать новую смету по объекту
  async create(
    estimateData: CreateObjectEstimateData
  ): Promise<ObjectEstimate> {
    console.log('API Request:', {
      table: 'object_estimates',
      action: 'insert',
      timestamp: new Date().toISOString(),
      data: estimateData,
    })

    if (!supabase) {
      console.error('Supabase client not initialized')
      throw new Error('Supabase client not initialized')
    }

    const { data, error } = await supabase
      .from('object_estimates')
      .insert([estimateData])
      .select()
      .single()

    console.log('API Request:', {
      table: 'object_estimates',
      action: 'insert',
      timestamp: new Date().toISOString(),
      success: !error,
      data: estimateData,
    })

    if (error) {
      console.error('Error creating object estimate:', error)
      throw error
    }

    return data
  },

  // Обновить смету по объекту
  async update(
    id: string,
    estimateData: UpdateObjectEstimateData
  ): Promise<ObjectEstimate> {
    console.log('API Request:', {
      table: 'object_estimates',
      action: 'update',
      timestamp: new Date().toISOString(),
      id,
      data: estimateData,
    })

    if (!supabase) {
      console.error('Supabase client not initialized')
      throw new Error('Supabase client not initialized')
    }

    const { data, error } = await supabase
      .from('object_estimates')
      .update(estimateData)
      .eq('id', id)
      .select()
      .single()

    console.log('API Request:', {
      table: 'object_estimates',
      action: 'update',
      timestamp: new Date().toISOString(),
      success: !error,
      id,
      data: estimateData,
    })

    if (error) {
      console.error('Error updating object estimate:', error)
      throw error
    }

    return data
  },

  // Мягкое удаление сметы по объекту (деактивация)
  async delete(id: string): Promise<void> {
    console.log('API Request:', {
      table: 'object_estimates',
      action: 'soft_delete',
      timestamp: new Date().toISOString(),
      id,
    })

    if (!supabase) {
      console.error('Supabase client not initialized')
      throw new Error('Supabase client not initialized')
    }

    const { error } = await supabase
      .from('object_estimates')
      .update({ is_active: false })
      .eq('id', id)

    console.log('API Request:', {
      table: 'object_estimates',
      action: 'soft_delete',
      timestamp: new Date().toISOString(),
      success: !error,
      id,
    })

    if (error) {
      console.error('Error deleting object estimate:', error)
      throw error
    }
  },
}
