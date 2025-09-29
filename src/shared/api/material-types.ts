import { supabase } from '@/lib/supabase'

export interface MaterialType {
  id: string
  name: string
  short_name: string
  description: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface MaterialTypeCreate {
  name: string
  short_name: string
  description?: string | null
  is_active?: boolean
}

export interface MaterialTypeUpdate {
  name?: string
  short_name?: string
  description?: string | null
  is_active?: boolean
}

// Mock data for development when Supabase is not available
const mockMaterialTypes: MaterialType[] = [
  {
    id: 'mat-type-0',
    name: 'Нет',
    short_name: 'нет',
    description: 'Без указания типа материала',
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'mat-type-1',
    name: 'Основной материал',
    short_name: 'основ',
    description: 'Основные строительные материалы',
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'mat-type-2',
    name: 'Вспомогательный материал',
    short_name: 'вспом',
    description: 'Вспомогательные материалы для строительства',
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'mat-type-3',
    name: 'Расходный материал',
    short_name: 'расход',
    description: 'Расходные материалы и инструменты',
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
]

export const materialTypesApi = {
  async getAll(): Promise<MaterialType[]> {
    console.log('API Request:', {
      table: 'material_types',
      action: 'select_all',
      timestamp: new Date().toISOString(),
    })

    if (!supabase) {
      console.warn('Supabase client not initialized, using mock data')
      return [...mockMaterialTypes]
    }

    try {
      const { data, error } = await supabase
        .from('material_types')
        .select('*')
        .eq('is_active', true)
        .order('name', { ascending: true })

      console.log('API Response:', {
        table: 'material_types',
        action: 'select_all',
        success: !error,
        dataCount: data?.length || 0,
        timestamp: new Date().toISOString(),
      })

      if (error) {
        console.error('Material types fetch failed, using mock data:', error)
        return [...mockMaterialTypes]
      }

      return data || []
    } catch (error) {
      console.error('Material types fetch failed, using mock data:', error)
      return [...mockMaterialTypes]
    }
  },

  async getById(id: string): Promise<MaterialType | null> {
    console.log('API Request:', {
      table: 'material_types',
      action: 'select_by_id',
      id,
      timestamp: new Date().toISOString(),
    })

    if (!supabase) {
      const mockType = mockMaterialTypes.find(t => t.id === id)
      return mockType || null
    }

    const { data, error } = await supabase
      .from('material_types')
      .select('*')
      .eq('id', id)
      .single()

    console.log('API Response:', {
      table: 'material_types',
      action: 'select_by_id',
      success: !error,
      found: !!data,
      timestamp: new Date().toISOString(),
    })

    if (error) {
      console.error('Material type fetch failed:', error)
      throw error
    }

    return data
  },

  async create(typeData: MaterialTypeCreate): Promise<MaterialType> {
    console.log('API Request:', {
      table: 'material_types',
      action: 'create',
      data: typeData,
      timestamp: new Date().toISOString(),
    })

    if (!supabase) {
      const mockType: MaterialType = {
        id: `mat-type-${Date.now()}`,
        ...typeData,
        is_active: typeData.is_active ?? true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }
      mockMaterialTypes.push(mockType)
      return mockType
    }

    const { data, error } = await supabase
      .from('material_types')
      .insert(typeData)
      .select()
      .single()

    console.log('API Response:', {
      table: 'material_types',
      action: 'create',
      success: !error,
      timestamp: new Date().toISOString(),
    })

    if (error) {
      console.error('Material type create failed:', error)
      throw error
    }

    return data
  },

  async update(
    id: string,
    typeData: MaterialTypeUpdate
  ): Promise<MaterialType> {
    console.log('API Request:', {
      table: 'material_types',
      action: 'update',
      id,
      data: typeData,
      timestamp: new Date().toISOString(),
    })

    if (!supabase) {
      const index = mockMaterialTypes.findIndex(t => t.id === id)
      if (index !== -1) {
        mockMaterialTypes[index] = {
          ...mockMaterialTypes[index],
          ...typeData,
          updated_at: new Date().toISOString(),
        }
        return mockMaterialTypes[index]
      }
      throw new Error('Material type not found')
    }

    const { data, error } = await supabase
      .from('material_types')
      .update(typeData)
      .eq('id', id)
      .select()
      .single()

    console.log('API Response:', {
      table: 'material_types',
      action: 'update',
      success: !error,
      timestamp: new Date().toISOString(),
    })

    if (error) {
      console.error('Material type update failed:', error)
      throw error
    }

    return data
  },

  async delete(id: string): Promise<void> {
    console.log('API Request:', {
      table: 'material_types',
      action: 'delete',
      id,
      timestamp: new Date().toISOString(),
    })

    if (!supabase) {
      const index = mockMaterialTypes.findIndex(t => t.id === id)
      if (index !== -1) {
        mockMaterialTypes.splice(index, 1)
      }
      return
    }

    const { error } = await supabase
      .from('material_types')
      .delete()
      .eq('id', id)

    console.log('API Response:', {
      table: 'material_types',
      action: 'delete',
      success: !error,
      timestamp: new Date().toISOString(),
    })

    if (error) {
      console.error('Material type delete failed:', error)
      throw error
    }
  },
}
