import { supabase } from '@/lib/supabase'

export interface MaterialPriceHistory {
  id: string
  material_id: string
  price: number
  changed_by?: string
  source: 'manual' | 'estimate_calculator' | 'import'
  notes?: string
  created_at: string
}

export interface MaterialPriceHistoryCreate {
  material_id: string
  price: number
  changed_by?: string
  source?: 'manual' | 'estimate_calculator' | 'import'
  notes?: string
}

class MaterialPriceHistoryApi {
  // Получить историю цен для материала
  async getByMaterialId(materialId: string): Promise<MaterialPriceHistory[]> {
    if (!supabase) {
      console.error('Supabase client not initialized')
      throw new Error('Database connection not available')
    }

    console.log('API Request: Getting price history for material', {
      action: 'get_price_history',
      materialId,
      timestamp: new Date().toISOString(),
    })

    const { data, error } = await supabase
      .from('material_price_history')
      .select('*')
      .eq('material_id', materialId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Get price history error:', error)
      throw error
    }

    console.log('API Response: Price history loaded', {
      action: 'get_price_history_response',
      count: data?.length || 0,
      timestamp: new Date().toISOString(),
    })

    return data || []
  }

  // Получить историю цен для нескольких материалов
  async getByMaterialIds(materialIds: string[]): Promise<MaterialPriceHistory[]> {
    if (!supabase) {
      console.error('Supabase client not initialized')
      throw new Error('Database connection not available')
    }

    console.log('API Request: Getting price history for multiple materials', {
      action: 'get_price_history_bulk',
      count: materialIds.length,
      timestamp: new Date().toISOString(),
    })

    const { data, error } = await supabase
      .from('material_price_history')
      .select('*')
      .in('material_id', materialIds)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Get price history bulk error:', error)
      throw error
    }

    console.log('API Response: Bulk price history loaded', {
      action: 'get_price_history_bulk_response',
      count: data?.length || 0,
      timestamp: new Date().toISOString(),
    })

    return data || []
  }

  // Добавить запись в историю цен
  async create(
    priceHistory: MaterialPriceHistoryCreate
  ): Promise<MaterialPriceHistory> {
    if (!supabase) {
      console.error('Supabase client not initialized')
      throw new Error('Database connection not available')
    }

    console.log('API Request: Creating price history record', {
      action: 'create_price_history',
      materialId: priceHistory.material_id,
      price: priceHistory.price,
      source: priceHistory.source,
      timestamp: new Date().toISOString(),
    })

    const { data, error } = await supabase
      .from('material_price_history')
      .insert(priceHistory)
      .select('*')
      .single()

    if (error) {
      console.error('Create price history error:', error)
      throw error
    }

    console.log('API Response: Price history created', {
      action: 'create_price_history_response',
      id: data.id,
      timestamp: new Date().toISOString(),
    })

    return data
  }

  // Получить статистику изменения цен за период
  async getPriceStatistics(
    materialId: string,
    startDate?: string,
    endDate?: string
  ): Promise<{
    minPrice: number
    maxPrice: number
    avgPrice: number
    currentPrice: number
    priceChange: number
    priceChangePercent: number
  }> {
    if (!supabase) {
      console.error('Supabase client not initialized')
      throw new Error('Database connection not available')
    }

    let query = supabase
      .from('material_price_history')
      .select('price, created_at')
      .eq('material_id', materialId)
      .order('created_at', { ascending: true })

    if (startDate) {
      query = query.gte('created_at', startDate)
    }

    if (endDate) {
      query = query.lte('created_at', endDate)
    }

    const { data, error } = await query

    if (error) {
      console.error('Get price statistics error:', error)
      throw error
    }

    if (!data || data.length === 0) {
      return {
        minPrice: 0,
        maxPrice: 0,
        avgPrice: 0,
        currentPrice: 0,
        priceChange: 0,
        priceChangePercent: 0,
      }
    }

    const prices = data.map(item => item.price)
    const minPrice = Math.min(...prices)
    const maxPrice = Math.max(...prices)
    const avgPrice = prices.reduce((a, b) => a + b, 0) / prices.length
    const currentPrice = prices[prices.length - 1]
    const firstPrice = prices[0]
    const priceChange = currentPrice - firstPrice
    const priceChangePercent = firstPrice > 0 ? (priceChange / firstPrice) * 100 : 0

    return {
      minPrice,
      maxPrice,
      avgPrice,
      currentPrice,
      priceChange,
      priceChangePercent,
    }
  }
}

export const materialPriceHistoryApi = new MaterialPriceHistoryApi()
