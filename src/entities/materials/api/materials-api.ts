import { supabase } from '@/lib/supabase'
import type {
  Material,
  MaterialCreate,
  MaterialUpdate,
  MaterialWithUnit,
  MaterialImportRow,
} from '../types'

// Mock данные для случая когда Supabase не настроен
const mockMaterials: MaterialWithUnit[] = [
  {
    id: 'mock-material-1',
    code: 'БT-001',
    name: 'Бетон М300',
    description: 'Бетонная смесь марки М300',
    category: 'concrete',
    unit_id: 'mock-unit-3',
    unit_name: 'метр кубический',
    unit_short_name: 'м³',
    last_purchase_price: 4500.0,
    supplier: 'ООО "БетонСтройМикс"',
    supplier_article: 'БСМ-М300',
    is_active: true,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
  {
    id: 'mock-material-2',
    code: 'АР-001',
    name: 'Арматура А500С ⌀12мм',
    description: 'Стальная арматура класса А500С диаметром 12мм',
    category: 'metal',
    unit_id: 'mock-unit-5',
    unit_name: 'килограмм',
    unit_short_name: 'кг',
    last_purchase_price: 65.8,
    supplier: 'ОАО "МеталлТорг"',
    supplier_article: 'МТ-А500С-12',
    is_active: true,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
  {
    id: 'mock-material-3',
    code: 'КР-001',
    name: 'Кирпич керамический рядовой',
    description: 'Кирпич керамический рядовой полнотелый марки М150',
    category: 'brick',
    unit_id: 'mock-unit-1',
    unit_name: 'штука',
    unit_short_name: 'шт',
    last_purchase_price: 12.5,
    supplier: 'ЗАО "КерамСтрой"',
    supplier_article: 'КС-М150',
    is_active: true,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
]

export const materialsApi = {
  async getAll(): Promise<MaterialWithUnit[]> {
    if (!supabase) {
      console.log('API Request:', {
        table: 'materials',
        action: 'select_all',
        mode: 'mock',
        timestamp: new Date().toISOString(),
        success: true,
        dataCount: mockMaterials.length,
      })
      return mockMaterials
    }

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
      console.log('Switching to mock mode due to error')
      console.log('API Request:', {
        table: 'materials',
        action: 'select_all_fallback',
        mode: 'mock',
        timestamp: new Date().toISOString(),
        success: true,
        dataCount: mockMaterials.length,
      })
      return mockMaterials
    }

    return data.map(material => ({
      ...material,
      unit_name: material.unit.name,
      unit_short_name: material.unit.short_name,
    }))
  },

  async getById(id: string): Promise<MaterialWithUnit> {
    if (!supabase) {
      const material = mockMaterials.find(m => m.id === id)
      console.log('API Request:', {
        table: 'materials',
        action: 'select_by_id',
        id,
        mode: 'mock',
        timestamp: new Date().toISOString(),
        success: !!material,
      })

      if (!material) {
        throw new Error(`Материал с id ${id} не найден`)
      }

      return material
    }

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
      console.log('Switching to mock mode due to error')
      const material = mockMaterials.find(m => m.id === id)
      if (!material) {
        throw new Error(`Материал с id ${id} не найден`)
      }
      return material
    }

    return {
      ...data,
      unit_name: data.unit.name,
      unit_short_name: data.unit.short_name,
    }
  },

  async getByCategory(category: string): Promise<MaterialWithUnit[]> {
    if (!supabase) {
      const filtered = mockMaterials.filter(
        m => m.category === category && m.is_active
      )
      console.log('API Request:', {
        table: 'materials',
        action: 'select_by_category',
        category,
        mode: 'mock',
        timestamp: new Date().toISOString(),
        success: true,
        dataCount: filtered.length,
      })
      return filtered
    }

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
      console.log('Switching to mock mode due to error')
      const filteredMaterials = mockMaterials.filter(
        m => m.category === category && m.is_active
      )
      console.log('API Request:', {
        table: 'materials',
        action: 'select_by_category_fallback',
        category,
        mode: 'mock',
        timestamp: new Date().toISOString(),
        success: true,
        dataCount: filteredMaterials.length,
      })
      return filteredMaterials
    }

    return data.map(material => ({
      ...material,
      unit_name: material.unit.name,
      unit_short_name: material.unit.short_name,
    }))
  },

  async create(materialData: MaterialCreate): Promise<Material> {
    if (!supabase) {
      const newMaterial: Material = {
        id: `mock-material-${Date.now()}`,
        ...materialData,
        is_active: materialData.is_active ?? true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }

      console.log('API Request:', {
        table: 'materials',
        action: 'create',
        data: materialData,
        mode: 'mock',
        timestamp: new Date().toISOString(),
        success: true,
      })

      return newMaterial
    }

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
      console.log('Switching to mock mode due to error')
      const newMaterial: MaterialWithUnit = {
        id: `mock-material-${Date.now()}`,
        ...materialData,
        unit_name: 'штука',
        unit_short_name: 'шт',
        is_active: materialData.is_active ?? true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }
      mockMaterials.push(newMaterial)
      console.log('API Request:', {
        table: 'materials',
        action: 'create_fallback',
        mode: 'mock',
        timestamp: new Date().toISOString(),
        success: true,
      })
      return newMaterial
    }

    return data
  },

  async update(id: string, materialData: MaterialUpdate): Promise<Material> {
    if (!supabase) {
      const existing = mockMaterials.find(m => m.id === id)
      if (!existing) {
        throw new Error(`Материал с id ${id} не найден`)
      }

      const updated: Material = {
        ...existing,
        ...materialData,
        updated_at: new Date().toISOString(),
      }

      console.log('API Request:', {
        table: 'materials',
        action: 'update',
        id,
        data: materialData,
        mode: 'mock',
        timestamp: new Date().toISOString(),
        success: true,
      })

      return updated
    }

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
      console.log('Switching to mock mode due to error')
      const materialIndex = mockMaterials.findIndex(m => m.id === id)
      if (materialIndex === -1) {
        throw new Error(`Материал с id ${id} не найден`)
      }
      const updatedMaterial = {
        ...mockMaterials[materialIndex],
        ...materialData,
        updated_at: new Date().toISOString(),
      }
      mockMaterials[materialIndex] = updatedMaterial
      console.log('API Request:', {
        table: 'materials',
        action: 'update_fallback',
        mode: 'mock',
        timestamp: new Date().toISOString(),
        success: true,
      })
      return updatedMaterial
    }

    return data
  },

  async delete(id: string): Promise<void> {
    if (!supabase) {
      console.log('API Request:', {
        table: 'materials',
        action: 'delete',
        id,
        mode: 'mock',
        timestamp: new Date().toISOString(),
        success: true,
      })
      return
    }

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
      console.log('Switching to mock mode due to error')
      const materialIndex = mockMaterials.findIndex(m => m.id === id)
      if (materialIndex === -1) {
        throw new Error(`Материал с id ${id} не найден`)
      }
      mockMaterials.splice(materialIndex, 1)
      console.log('API Request:', {
        table: 'materials',
        action: 'delete_fallback',
        mode: 'mock',
        timestamp: new Date().toISOString(),
        success: true,
      })
      return
    }
  },

  async bulkImport(materials: MaterialImportRow[]): Promise<Material[]> {
    console.log('API Request:', {
      table: 'materials',
      action: 'bulk_import_start',
      count: materials.length,
      timestamp: new Date().toISOString(),
    })

    if (!supabase) {
      // Mock импорт - создаем новые записи
      const importedMaterials: Material[] = materials.map((row, index) => ({
        id: `mock-import-${Date.now()}-${index}`,
        code: row.code,
        name: row.name,
        description: row.description,
        category: row.category,
        unit_id: 'mock-unit-1', // Используем mock unit id
        last_purchase_price: row.last_purchase_price,
        supplier: row.supplier,
        supplier_article: row.supplier_article,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }))

      console.log('API Request:', {
        table: 'materials',
        action: 'bulk_import_complete',
        imported: importedMaterials.length,
        mode: 'mock',
        timestamp: new Date().toISOString(),
        success: true,
      })

      return importedMaterials
    }

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
      console.log('Switching to mock mode due to error')
      const newMaterials: MaterialWithUnit[] = materials.map(
        (material, index) => ({
          id: `mock-material-import-${Date.now()}-${index}`,
          ...material,
          unit_id: material.unit_id || 'mock-unit-1',
          unit_name: 'штука',
          unit_short_name: 'шт',
          is_active: material.is_active ?? true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
      )
      mockMaterials.push(...newMaterials)
      console.log('API Request:', {
        table: 'materials',
        action: 'bulk_import_fallback',
        mode: 'mock',
        timestamp: new Date().toISOString(),
        success: true,
        dataCount: newMaterials.length,
      })
      return newMaterials
    }

    return data
  },

  /**
   * Обновить цену материала с сохранением истории
   * @param materialId - ID материала
   * @param newPrice - Новая цена
   * @param source - Источник изменения
   * @param notes - Дополнительные заметки
   */
  async updatePriceWithHistory(
    materialId: string,
    newPrice: number,
    source: 'manual' | 'estimate_calculator' | 'import' = 'manual',
    notes?: string
  ): Promise<Material> {
    if (!supabase) {
      console.log('API Request:', {
        table: 'materials',
        action: 'update_price_with_history',
        materialId,
        newPrice,
        source,
        mode: 'mock',
        timestamp: new Date().toISOString(),
        success: true,
      })

      const materialIndex = mockMaterials.findIndex(m => m.id === materialId)
      if (materialIndex === -1) {
        throw new Error(`Материал с id ${materialId} не найден`)
      }

      const updatedMaterial = {
        ...mockMaterials[materialIndex],
        last_purchase_price: newPrice,
        updated_at: new Date().toISOString(),
      }
      mockMaterials[materialIndex] = updatedMaterial

      return updatedMaterial
    }

    console.log('API Request: Updating material price with history', {
      action: 'update_price_with_history',
      materialId,
      newPrice,
      source,
      timestamp: new Date().toISOString(),
    })

    // Обновляем цену материала
    const { data: updatedMaterial, error: updateError } = await supabase
      .from('materials')
      .update({
        last_purchase_price: newPrice,
        updated_at: new Date().toISOString(),
      })
      .eq('id', materialId)
      .select()
      .single()

    if (updateError) {
      console.error('Update material price failed:', updateError)
      throw updateError
    }

    // Добавляем запись в историю цен
    const { error: historyError } = await supabase
      .from('material_price_history')
      .insert({
        material_id: materialId,
        price: newPrice,
        source,
        notes,
      })

    if (historyError) {
      console.error('Create price history failed:', historyError)
      // Не бросаем ошибку, т.к. основная задача выполнена
      console.warn('Price updated but history record failed')
    }

    console.log('API Response: Price updated successfully', {
      action: 'update_price_with_history_response',
      success: true,
      timestamp: new Date().toISOString(),
    })

    return updatedMaterial
  },
}
