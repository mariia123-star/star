import { supabase } from '@/lib/supabase'

export interface RateMaterial {
  id: string
  rate_id: string
  material_id: string
  consumption: number
  unit_price: number
  notes?: string
  created_at: string
  updated_at: string
  // Расширенные поля из джоинов
  material?: {
    id: string
    code: string
    name: string
    description?: string
    unit_id: string
    unit_name: string
    unit_short_name: string
    last_purchase_price?: number
    is_active: boolean
  }
}

export interface RateMaterialCreate {
  rate_id: string
  material_id: string
  consumption: number
  unit_price: number
  notes?: string
}

export interface RateMaterialUpdate {
  consumption?: number
  unit_price?: number
  notes?: string
}

class RateMaterialsApi {
  // Получить все материалы для расценки
  async getByRateId(rateId: string): Promise<RateMaterial[]> {
    if (!supabase) {
      console.error('Supabase client not initialized')
      throw new Error('Database connection not available')
    }

    console.log('API Request: Getting materials for rate', {
      action: 'get_materials_by_rate',
      rateId,
      timestamp: new Date().toISOString(),
    })

    const { data, error } = await supabase
      .from('rate_materials_mapping')
      .select(`
        *,
        material:materials (
          id,
          code,
          name,
          description,
          unit_id,
          unit_name,
          unit_short_name,
          last_purchase_price,
          is_active,
          unit:units (
            id,
            name,
            short_name
          )
        )
      `)
      .eq('rate_id', rateId)
      .order('created_at', { ascending: true })

    console.log('API Response: Materials for rate', {
      action: 'get_materials_by_rate_response',
      success: !error,
      dataCount: data?.length || 0,
      timestamp: new Date().toISOString(),
    })

    if (error) {
      console.error('Get materials by rate error:', error)
      throw error
    }

    return data || []
  }

  // Добавить материал к расценке
  async create(rateMaterial: RateMaterialCreate): Promise<RateMaterial> {
    if (!supabase) {
      console.error('Supabase client not initialized')
      throw new Error('Database connection not available')
    }

    console.log('API Request: Creating rate material', {
      action: 'create_rate_material',
      rateMaterial,
      timestamp: new Date().toISOString(),
    })

    const { data, error } = await supabase
      .from('rate_materials_mapping')
      .insert(rateMaterial)
      .select(`
        *,
        material:materials (
          id,
          code,
          name,
          description,
          unit_id,
          unit_name,
          unit_short_name,
          last_purchase_price,
          is_active,
          unit:units (
            id,
            name,
            short_name
          )
        )
      `)
      .single()

    console.log('API Response: Rate material created', {
      action: 'create_rate_material_response',
      success: !error,
      timestamp: new Date().toISOString(),
    })

    if (error) {
      console.error('Create rate material error:', error)
      throw error
    }

    return data
  }

  // Обновить материал в расценке
  async update(id: string, data: RateMaterialUpdate): Promise<RateMaterial> {
    console.log('API Request: Updating rate material', {
      action: 'update_rate_material',
      id,
      data,
      timestamp: new Date().toISOString(),
    })

    const updateData = {
      ...data,
      updated_at: new Date().toISOString(),
    }

    if (!supabase) {
      console.error('Supabase client not initialized')
      throw new Error('Database connection not available')
    }

    const { data: updatedData, error } = await supabase
      .from('rate_materials_mapping')
      .update(updateData)
      .eq('id', id)
      .select(`
        *,
        material:materials (
          id,
          code,
          name,
          description,
          unit_id,
          unit_name,
          unit_short_name,
          last_purchase_price,
          is_active,
          unit:units (
            id,
            name,
            short_name
          )
        )
      `)
      .single()

    console.log('API Response: Rate material updated', {
      action: 'update_rate_material_response',
      success: !error,
      timestamp: new Date().toISOString(),
    })

    if (error) {
      console.error('Update rate material error:', error)
      throw error
    }

    return updatedData
  }

  // Удалить материал из расценки
  async delete(id: string): Promise<void> {
    if (!supabase) {
      console.error('Supabase client not initialized')
      throw new Error('Database connection not available')
    }

    console.log('API Request: Deleting rate material', {
      action: 'delete_rate_material',
      id,
      timestamp: new Date().toISOString(),
    })

    const { error } = await supabase
      .from('rate_materials_mapping')
      .delete()
      .eq('id', id)

    console.log('API Response: Rate material deleted', {
      action: 'delete_rate_material_response',
      success: !error,
      timestamp: new Date().toISOString(),
    })

    if (error) {
      console.error('Delete rate material error:', error)
      throw error
    }
  }

  // Пакетное добавление материалов к расценке
  async createMany(rateMaterials: RateMaterialCreate[]): Promise<RateMaterial[]> {
    if (!supabase) {
      console.error('Supabase client not initialized')
      throw new Error('Database connection not available')
    }

    console.log('API Request: Creating multiple rate materials', {
      action: 'create_many_rate_materials',
      count: rateMaterials.length,
      timestamp: new Date().toISOString(),
    })

    const { data, error } = await supabase
      .from('rate_materials_mapping')
      .insert(rateMaterials)
      .select(`
        *,
        material:materials (
          id,
          code,
          name,
          description,
          unit_id,
          unit_name,
          unit_short_name,
          last_purchase_price,
          is_active,
          unit:units (
            id,
            name,
            short_name
          )
        )
      `)

    console.log('API Response: Multiple rate materials created', {
      action: 'create_many_rate_materials_response',
      success: !error,
      dataCount: data?.length || 0,
      timestamp: new Date().toISOString(),
    })

    if (error) {
      console.error('Create many rate materials error:', error)
      throw error
    }

    return data || []
  }

  // Удалить все материалы из расценки
  async deleteByRateId(rateId: string): Promise<void> {
    if (!supabase) {
      console.error('Supabase client not initialized')
      throw new Error('Database connection not available')
    }

    console.log('API Request: Deleting all materials from rate', {
      action: 'delete_materials_by_rate',
      rateId,
      timestamp: new Date().toISOString(),
    })

    const { error } = await supabase
      .from('rate_materials_mapping')
      .delete()
      .eq('rate_id', rateId)

    console.log('API Response: All materials deleted from rate', {
      action: 'delete_materials_by_rate_response',
      success: !error,
      timestamp: new Date().toISOString(),
    })

    if (error) {
      console.error('Delete materials by rate error:', error)
      throw error
    }
  }
}

export const rateMaterialsApi = new RateMaterialsApi()