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
  materials?: {
    id: string
    code: string
    name: string
    description?: string
    unit_id: string
    last_purchase_price?: number
    is_active: boolean
    units?: {
      id: string
      name: string
      short_name: string
    }
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

    // Шаг 1: Получаем связи rate_materials_mapping
    const { data: mappings, error: mappingsError } = await supabase
      .from('rate_materials_mapping')
      .select('*')
      .eq('rate_id', rateId)
      .order('created_at', { ascending: true })

    if (mappingsError) {
      console.error('Get rate materials mapping error:', mappingsError)
      throw mappingsError
    }

    if (!mappings || mappings.length === 0) {
      console.log('No materials found for rate', { rateId })
      return []
    }

    // Шаг 2: Получаем материалы по их ID
    const materialIds = mappings.map(m => m.material_id)
    const { data: materials, error: materialsError } = await supabase
      .from('materials')
      .select('*')
      .in('id', materialIds)

    if (materialsError) {
      console.error('Get materials error:', materialsError)
      throw materialsError
    }

    // Шаг 3: Получаем единицы измерения для материалов
    const unitIds = materials?.map(m => m.unit_id).filter(Boolean) || []
    const { data: units, error: unitsError } = await supabase
      .from('units')
      .select('*')
      .in('id', unitIds)

    if (unitsError) {
      console.error('Get units error:', unitsError)
      throw unitsError
    }

    // Шаг 4: Собираем данные вместе
    const result: RateMaterial[] = mappings.map(mapping => {
      const material = materials?.find(m => m.id === mapping.material_id)
      const unit = units?.find(u => u.id === material?.unit_id)

      return {
        id: mapping.id,
        rate_id: mapping.rate_id,
        material_id: mapping.material_id,
        consumption: mapping.consumption,
        unit_price: mapping.unit_price,
        notes: mapping.notes,
        created_at: mapping.created_at,
        updated_at: mapping.updated_at,
        materials: material ? {
          id: material.id,
          code: material.code,
          name: material.name,
          description: material.description,
          unit_id: material.unit_id,
          last_purchase_price: material.last_purchase_price,
          is_active: material.is_active,
          units: unit ? {
            id: unit.id,
            name: unit.name,
            short_name: unit.short_name,
          } : undefined,
        } : undefined,
      }
    })

    console.log('API Response: Materials for rate (manual JOIN)', {
      action: 'get_materials_by_rate_response',
      success: true,
      dataCount: result.length,
      timestamp: new Date().toISOString(),
    })

    return result
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
      .select('*')
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
      .select('*')
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
  async createMany(
    rateMaterials: RateMaterialCreate[]
  ): Promise<RateMaterial[]> {
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
      .select('*')

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
