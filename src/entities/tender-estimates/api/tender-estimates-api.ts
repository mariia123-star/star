import { supabase } from '@/lib/supabase'
import {
  PERFORMANCE_THRESHOLDS,
} from '@/shared/lib/cache-config'

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
  // Новые поля для расширенной тендерной сметы
  material_type?: string       // Тип материала (Основ/Вспом)
  coefficient?: number         // Коэффициент расхода материала
  work_price?: number         // Цена работы за единицу
  material_price?: number     // Цена материала с НДС
  delivery_cost?: number      // Стоимость доставки
  record_type?: 'work' | 'material' | 'summary'  // Тип записи
  project_id?: string         // ID проекта
}

export interface TenderEstimateWithUnit extends TenderEstimate {
  unit_name: string
  unit_short_name: string
  project_name?: string | null
  customer?: string
  work_name?: string
}

export interface TenderEstimateCreate {
  materials: string
  works: string
  quantity: number
  unit_id: string
  unit_price?: number
  notes?: string
  // Новые поля для создания расширенной тендерной сметы
  material_type?: string       // Тип материала (Основ/Вспом)
  coefficient?: number         // Коэффициент расхода материала
  work_price?: number         // Цена работы за единицу
  material_price?: number     // Цена материала с НДС
  delivery_cost?: number      // Стоимость доставки
  record_type?: 'work' | 'material' | 'summary'  // Тип записи
  project_id?: string         // ID проекта
}

export interface TenderEstimateUpdate {
  materials?: string
  works?: string
  quantity?: number
  unit_id?: string
  unit_price?: number
  notes?: string
  is_active?: boolean
  // Новые поля для обновления расширенной тендерной сметы
  material_type?: string       // Тип материала (Основ/Вспом)
  coefficient?: number         // Коэффициент расхода материала
  work_price?: number         // Цена работы за единицу
  material_price?: number     // Цена материала с НДС
  delivery_cost?: number      // Стоимость доставки
  record_type?: 'work' | 'material' | 'summary'  // Тип записи
  project_id?: string         // ID проекта
}

export interface TenderEstimateFilters {
  projectId?: string | null
  isActive?: boolean
  search?: string
  dateRange?: {
    from: string
    to: string
  }
  limit?: number
  offset?: number
}

export interface BulkImportResult {
  inserted: number
  errors: number
  duration: number
}

export interface SearchOptions {
  query: string
  projectId?: string
  limit?: number
}

export const tenderEstimatesApi = {
  // Оптимизированный метод для получения всех смет с фильтрами и пагинацией
  async getAll(
    filters: TenderEstimateFilters = {}
  ): Promise<TenderEstimateWithUnit[]> {
    if (!supabase) {
      console.error('Supabase client not initialized')
      throw new Error('Database connection not available')
    }

    const startTime = Date.now()
    const {
      isActive = true,
      search,
      dateRange,
      limit = 1000,
      offset = 0,
    } = filters

    console.log('API Request:', {
      table: 'mv_tender_estimates',
      action: 'select_optimized',
      filters,
      timestamp: new Date().toISOString(),
    })

    // Используем базовую таблицу с JOIN для получения данных о единицах
    let query = supabase
      .from('tender_estimates')
      .select(`
        *,
        unit:units(id, name, short_name)
      `)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    // Применяем фильтры
    // Примечание: project_id не существует в таблице tender_estimates

    if (isActive !== undefined) {
      query = query.eq('is_active', isActive)
    }

    // Поиск по тексту - используем полнотекстовый поиск PostgreSQL
    if (search && search.trim()) {
      query = query.textSearch('search_vector', search, {
        type: 'websearch',
        config: 'russian',
      })
    }

    // Фильтр по дате
    if (dateRange) {
      query = query
        .gte('created_at', dateRange.from)
        .lte('created_at', dateRange.to)
    }

    const { data, error } = await query
    const duration = Date.now() - startTime

    console.log('API Request result:', {
      success: !error,
      dataCount: data?.length || 0,
      duration: `${duration.toFixed(2)}ms`,
      isSlowQuery: duration > PERFORMANCE_THRESHOLDS.SLOW_QUERY_MS,
    })

    if (duration > PERFORMANCE_THRESHOLDS.SLOW_QUERY_MS) {
      console.warn('Slow query detected:', { duration, filters })
    }

    if (error) {
      console.error('Failed to fetch tender estimates:', error)
      throw error
    }

    // Преобразуем данные в нужный формат
    const transformedData = (data || []).map((item: any) => ({
      ...item,
      unit_name: (item.unit as any)?.name || '',
      unit_short_name: (item.unit as any)?.short_name || '',
      customer: item.materials ? 'мат' : item.works ? 'раб' : '',
      work_name: (item.materials as any) || (item.works as any) || '',
    }))

    return transformedData
  },

  async getById(id: string): Promise<TenderEstimate | null> {
    if (!supabase) {
      console.error('Supabase client not initialized')
      throw new Error('Database connection not available')
    }

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
    if (!supabase) {
      console.error('Supabase client not initialized')
      throw new Error('Database connection not available')
    }

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

  async update(
    id: string,
    estimate: TenderEstimateUpdate
  ): Promise<TenderEstimate> {
    if (!supabase) {
      console.error('Supabase client not initialized')
      throw new Error('Database connection not available')
    }

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
    if (!supabase) {
      console.error('Supabase client not initialized')
      throw new Error('Database connection not available')
    }

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
    if (!supabase) {
      console.error('Supabase client not initialized')
      throw new Error('Database connection not available')
    }

    const startTime = Date.now()
    console.log('API Request:', {
      table: 'tender_estimates',
      action: 'bulk_delete',
      count: ids.length,
      timestamp: new Date().toISOString(),
    })

    const { error } = await supabase
      .from('tender_estimates')
      .update({ is_active: false })
      .in('id', ids)

    const duration = Date.now() - startTime
    console.log('Bulk delete result:', {
      success: !error,
      count: ids.length,
      duration: `${duration.toFixed(2)}ms`,
    })

    if (error) {
      console.error('Failed to delete tender estimates:', error)
      throw error
    }
  },

  // Быстрый поиск с использованием полнотекстового индекса
  async search(options: SearchOptions): Promise<TenderEstimateWithUnit[]> {
    if (!supabase) {
      console.error('Supabase client not initialized')
      throw new Error('Database connection not available')
    }

    const startTime = Date.now()
    const { query: searchQuery, limit = 100 } = options

    console.log('API Request:', {
      table: 'tender_estimates',
      action: 'search',
      query: searchQuery,
      timestamp: new Date().toISOString(),
    })

    // Используем простой поиск по базовой таблице
    let query = supabase
      .from('tender_estimates')
      .select(`
        *,
        unit:units(id, name, short_name)
      `)
      .eq('is_active', true)
      .limit(limit)
    
    // Поиск по материалам и работам
    if (searchQuery && searchQuery.trim()) {
      query = query.or(`materials.ilike.%${searchQuery}%,works.ilike.%${searchQuery}%,notes.ilike.%${searchQuery}%`)
    }

    const { data, error } = await query

    const duration = Date.now() - startTime

    console.log('Search result:', {
      success: !error,
      dataCount: data?.length || 0,
      duration: `${duration.toFixed(2)}ms`,
      query: searchQuery,
    })

    if (error) {
      console.error('Failed to search tender estimates:', error)
      throw error
    }

    // Преобразуем данные в нужный формат
    const transformedData = (data || []).map((item: any) => ({
      ...item,
      unit_name: (item.unit as any)?.name || '',
      unit_short_name: (item.unit as any)?.short_name || '',
      customer: item.materials ? 'мат' : item.works ? 'раб' : '',
      work_name: (item.materials as any) || (item.works as any) || '',
    }))

    return transformedData
  },

  // Массовый импорт с использованием оптимизированной функции БД
  async bulkImport(
    estimates: TenderEstimateCreate[]
  ): Promise<BulkImportResult> {
    if (!supabase) {
      console.error('Supabase client not initialized')
      throw new Error('Database connection not available')
    }

    const startTime = Date.now()

    console.log('API Request:', {
      table: 'tender_estimates',
      action: 'bulk_import',
      count: estimates.length,
      timestamp: new Date().toISOString(),
    })

    // Проверка размера данных
    if (estimates.length > PERFORMANCE_THRESHOLDS.LARGE_DATASET_ROWS) {
      console.warn('Large dataset import:', estimates.length, 'records')
    }

    // Подготовка данных для функции PostgreSQL
    const estimatesJson = estimates.map(est => ({
      materials: est.materials,
      works: est.works,
      quantity: est.quantity,
      unit_id: est.unit_id,
      unit_price: est.unit_price || 0,
      notes: est.notes,
    }))

    // Вызов оптимизированной функции массового импорта
    const { data, error } = await supabase.rpc('bulk_insert_tender_estimates', {
      estimates: estimatesJson,
    })

    const duration = Date.now() - startTime

    if (error) {
      console.error('Bulk import failed:', error)
      throw error
    }

    const result: BulkImportResult = {
      inserted: data?.[0]?.inserted_count || 0,
      errors: data?.[0]?.error_count || 0,
      duration: duration,
    }

    console.log('Bulk import result:', {
      ...result,
      duration: `${duration.toFixed(2)}ms`,
      rate: `${(result.inserted / (duration / 1000)).toFixed(0)} records/sec`,
      isAcceptable:
        duration <= PERFORMANCE_THRESHOLDS.ACCEPTABLE_IMPORT_TIME_MS,
    })

    // Предупреждение о медленном импорте
    if (duration > PERFORMANCE_THRESHOLDS.ACCEPTABLE_IMPORT_TIME_MS) {
      console.warn('Import slower than expected:', {
        actual: `${duration.toFixed(0)}ms`,
        target: `${PERFORMANCE_THRESHOLDS.ACCEPTABLE_IMPORT_TIME_MS}ms`,
      })
    }

    return result
  },

  // Массовое обновление статуса
  async bulkUpdateStatus(ids: string[], isActive: boolean): Promise<number> {
    if (!supabase) {
      console.error('Supabase client not initialized')
      throw new Error('Database connection not available')
    }

    const startTime = Date.now()

    console.log('API Request:', {
      table: 'tender_estimates',
      action: 'bulk_status_update',
      count: ids.length,
      isActive,
      timestamp: new Date().toISOString(),
    })

    const { error, count } = await supabase
      .from('tender_estimates')
      .update({ is_active: isActive })
      .in('id', ids)

    const duration = Date.now() - startTime

    if (error) {
      console.error('Bulk status update failed:', error)
      throw error
    }

    const updatedCount = count || 0

    console.log('Bulk status update result:', {
      success: true,
      updatedCount,
      duration: `${duration.toFixed(2)}ms`,
    })

    return updatedCount
  },

  // Получение аналитики по проекту
  async getProjectAnalytics(_projectId?: string) {
    if (!supabase) {
      console.error('Supabase client not initialized')
      throw new Error('Database connection not available')
    }

    const startTime = Date.now()

    console.log('API Request:', {
      table: 'tender_estimates',
      action: 'analytics',
      timestamp: new Date().toISOString(),
    })

    // Простая аналитика без специальной функции БД
    const { data, error } = await supabase
      .from('tender_estimates')
      .select('quantity, unit_price, total_price')
      .eq('is_active', true)

    const duration = Date.now() - startTime

    console.log('Analytics result:', {
      success: !error,
      dataCount: data?.length || 0,
      duration: `${duration.toFixed(2)}ms`,
    })

    if (error) {
      console.error('Failed to get project analytics:', error)
      throw error
    }

    return data || []
  },

  // Метод для получения количества записей (для пагинации)
  async getCount(filters: TenderEstimateFilters = {}): Promise<number> {
    if (!supabase) {
      console.error('Supabase client not initialized')
      throw new Error('Database connection not available')
    }

    const { isActive = true, search, dateRange } = filters

    let query = supabase
      .from('tender_estimates')
      .select('*', { count: 'exact', head: true })

    if (isActive !== undefined) {
      query = query.eq('is_active', isActive)
    }

    if (search && search.trim()) {
      query = query.or(`materials.ilike.%${search}%,works.ilike.%${search}%,notes.ilike.%${search}%`)
    }

    if (dateRange) {
      query = query
        .gte('created_at', dateRange.from)
        .lte('created_at', dateRange.to)
    }

    const { count, error } = await query

    if (error) {
      console.error('Failed to get count:', error)
      throw error
    }

    return count || 0
  },
}
