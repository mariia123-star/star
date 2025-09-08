import { supabase } from '@/lib/supabase'
import type {
  Material,
  MaterialCreate,
  MaterialUpdate,
  MaterialWithUnit,
  MaterialImportRow,
} from '../types'

export const materialsApi = {
  async getAll(): Promise<MaterialWithUnit[]> {
    const { data, error } = await supabase
      .from('materials')
      .select(
        `
        *,
        unit:units!inner(
          name,
          short_name
        )
      `
      )
      .order('created_at', { ascending: false })

    console.log('API Request:', {
      table: 'materials',
      action: 'select_all',
      timestamp: new Date().toISOString(),
      success: !error,
      dataCount: data?.length || 0,
    })

    if (error) {
      console.error('Get all materials failed:', error)
      throw error
    }

    return data.map(material => ({
      ...material,
      unit_name: material.unit.name,
      unit_short_name: material.unit.short_name,
    }))
  },

  async getById(id: string): Promise<MaterialWithUnit> {
    const { data, error } = await supabase
      .from('materials')
      .select(
        `
        *,
        unit:units!inner(
          name,
          short_name
        )
      `
      )
      .eq('id', id)
      .single()

    console.log('API Request:', {
      table: 'materials',
      action: 'select_by_id',
      id,
      timestamp: new Date().toISOString(),
      success: !error,
    })

    if (error) {
      console.error('Get material by id failed:', error)
      throw error
    }

    return {
      ...data,
      unit_name: data.unit.name,
      unit_short_name: data.unit.short_name,
    }
  },

  async getByCategory(category: string): Promise<MaterialWithUnit[]> {
    const { data, error } = await supabase
      .from('materials')
      .select(
        `
        *,
        unit:units!inner(
          name,
          short_name
        )
      `
      )
      .eq('category', category)
      .eq('is_active', true)
      .order('name', { ascending: true })

    console.log('API Request:', {
      table: 'materials',
      action: 'select_by_category',
      category,
      timestamp: new Date().toISOString(),
      success: !error,
      dataCount: data?.length || 0,
    })

    if (error) {
      console.error('Get materials by category failed:', error)
      throw error
    }

    return data.map(material => ({
      ...material,
      unit_name: material.unit.name,
      unit_short_name: material.unit.short_name,
    }))
  },

  async create(materialData: MaterialCreate): Promise<Material> {
    const { data, error } = await supabase
      .from('materials')
      .insert([
        {
          ...materialData,
          is_active: materialData.is_active ?? true,
        },
      ])
      .select()
      .single()

    console.log('API Request:', {
      table: 'materials',
      action: 'create',
      data: materialData,
      timestamp: new Date().toISOString(),
      success: !error,
    })

    if (error) {
      console.error('Create material failed:', error)
      throw error
    }

    return data
  },

  async update(id: string, materialData: MaterialUpdate): Promise<Material> {
    const { data, error } = await supabase
      .from('materials')
      .update({
        ...materialData,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single()

    console.log('API Request:', {
      table: 'materials',
      action: 'update',
      id,
      data: materialData,
      timestamp: new Date().toISOString(),
      success: !error,
    })

    if (error) {
      console.error('Update material failed:', error)
      throw error
    }

    return data
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase.from('materials').delete().eq('id', id)

    console.log('API Request:', {
      table: 'materials',
      action: 'delete',
      id,
      timestamp: new Date().toISOString(),
      success: !error,
    })

    if (error) {
      console.error('Delete material failed:', error)
      throw error
    }
  },

  async bulkImport(materials: MaterialImportRow[]): Promise<Material[]> {
    console.log('API Request:', {
      table: 'materials',
      action: 'bulk_import_start',
      count: materials.length,
      timestamp: new Date().toISOString(),
    })

    // Получаем все единицы измерения для поиска по названию
    const { data: units, error: unitsError } = await supabase
      .from('units')
      .select('id, name, short_name')

    if (unitsError) {
      console.error('Get units for import failed:', unitsError)
      throw unitsError
    }

    // Подготавливаем данные для импорта
    const materialsToImport: MaterialCreate[] = materials.map(row => {
      const unit = units.find(
        u => u.name === row.unit_name || u.short_name === row.unit_name
      )

      if (!unit) {
        throw new Error(`Единица измерения не найдена: ${row.unit_name}`)
      }

      return {
        code: row.code,
        name: row.name,
        description: row.description,
        category: row.category,
        unit_id: unit.id,
        last_purchase_price: row.last_purchase_price,
        supplier: row.supplier,
        supplier_article: row.supplier_article,
        is_active: true,
      }
    })

    const { data, error } = await supabase
      .from('materials')
      .insert(materialsToImport)
      .select()

    console.log('API Request:', {
      table: 'materials',
      action: 'bulk_import_complete',
      imported: data?.length || 0,
      timestamp: new Date().toISOString(),
      success: !error,
    })

    if (error) {
      console.error('Bulk import materials failed:', error)
      throw error
    }

    return data
  },
}
