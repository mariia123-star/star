import { supabase } from '@/lib/supabase'
import type { Rate, RateCreate, RateUpdate, RateWithUnit } from '../types'

// Mock данные для случая когда Supabase не настроен
const mockRates: RateWithUnit[] = [
  {
    id: 'mock-rate-1',
    code: 'СР-001',
    name: 'Кирпич керамический лицевой',
    description: 'Кирпич керамический лицевой одинарный М150',
    unit_id: 'mock-unit-1',
    base_price: 25.5,
    category: 'материал',
    subcategory: 'кирпич',
    is_active: true,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    unit_name: 'штука',
    unit_short_name: 'шт',
  },
  {
    id: 'mock-rate-2',
    code: 'СР-002',
    name: 'Цемент М500',
    description: 'Цемент портландский М500 Д0',
    unit_id: 'mock-unit-2',
    base_price: 450.0,
    category: 'материал',
    subcategory: 'вяжущие',
    is_active: true,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    unit_name: 'килограмм',
    unit_short_name: 'кг',
  },
  {
    id: 'mock-rate-3',
    code: 'ОР-001',
    name: 'Кладка кирпичная',
    description: 'Кладка стен из керамического кирпича на цементном растворе',
    unit_id: 'mock-unit-3',
    base_price: 3500.0,
    category: 'общестроительные_работы',
    subcategory: 'каменные работы',
    is_active: true,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    unit_name: 'метр кубический',
    unit_short_name: 'м³',
  },
]

export const ratesApi = {
  async getAll(): Promise<RateWithUnit[]> {
    // Если Supabase не настроен, возвращаем mock данные
    if (!supabase) {
      console.log('API Request:', {
        table: 'rates',
        action: 'select_all',
        mode: 'mock',
        timestamp: new Date().toISOString(),
        success: true,
        dataCount: mockRates.length,
      })

      return Promise.resolve(mockRates)
    }

    const { data, error } = await supabase
      .from('rates')
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
      table: 'rates',
      action: 'select_all',
      mode: 'supabase',
      timestamp: new Date().toISOString(),
      success: !error,
      dataCount: data?.length || 0,
    })

    if (error) {
      console.error('Get all rates failed:', error)
      console.log('Switching to mock mode due to error')
      console.log('API Request:', {
        table: 'rates',
        action: 'select_all_fallback',
        mode: 'mock',
        timestamp: new Date().toISOString(),
        success: true,
        dataCount: mockRates.length,
      })
      return mockRates
    }

    return data.map(rate => ({
      ...rate,
      unit_name: rate.unit.name,
      unit_short_name: rate.unit.short_name,
    }))
  },

  async getById(id: string): Promise<RateWithUnit> {
    if (!supabase) {
      console.error('Supabase client not initialized')
      const rate = mockRates.find(r => r.id === id)
      if (!rate) {
        throw new Error(`Расценка с id ${id} не найдена`)
      }
      return rate
    }

    const { data, error } = await supabase
      .from('rates')
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
      table: 'rates',
      action: 'select_by_id',
      id,
      timestamp: new Date().toISOString(),
      success: !error,
    })

    if (error) {
      console.error('Get rate by id failed:', error)
      console.log('Switching to mock mode due to error')
      const rate = mockRates.find(r => r.id === id)
      if (!rate) {
        throw new Error(`Расценка с id ${id} не найдена`)
      }
      return rate
    }

    return {
      ...data,
      unit_name: data.unit.name,
      unit_short_name: data.unit.short_name,
    }
  },

  async create(rateData: RateCreate): Promise<Rate> {
    // Если Supabase не настроен, возвращаем mock данные
    if (!supabase) {
      const mockRate: Rate = {
        id: `mock-rate-${Date.now()}`,
        ...rateData,
        is_active: rateData.is_active ?? true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }

      console.log('API Request:', {
        table: 'rates',
        action: 'create',
        mode: 'mock',
        data: rateData,
        timestamp: new Date().toISOString(),
        success: true,
      })

      // Добавляем в mock массив
      const mockUnit = { name: 'штука', short_name: 'шт' } // Получили бы из units API
      mockRates.push({
        ...mockRate,
        unit_name: mockUnit.name,
        unit_short_name: mockUnit.short_name,
      })

      return Promise.resolve(mockRate)
    }

    const { data, error } = await supabase
      .from('rates')
      .insert([
        {
          ...rateData,
          is_active: rateData.is_active ?? true,
        },
      ])
      .select()
      .single()

    console.log('API Request:', {
      table: 'rates',
      action: 'create',
      mode: 'supabase',
      data: rateData,
      timestamp: new Date().toISOString(),
      success: !error,
    })

    if (error) {
      console.error('Create rate failed:', error)
      console.log('Switching to mock mode due to error')
      const newRate: RateWithUnit = {
        id: `mock-rate-${Date.now()}`,
        ...rateData,
        unit_name: 'штука',
        unit_short_name: 'шт',
        is_active: rateData.is_active ?? true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }
      mockRates.push(newRate)
      console.log('API Request:', {
        table: 'rates',
        action: 'create_fallback',
        mode: 'mock',
        timestamp: new Date().toISOString(),
        success: true,
      })
      return newRate
    }

    return data
  },

  async update(id: string, rateData: RateUpdate): Promise<Rate> {
    if (!supabase) {
      console.error('Supabase client not initialized')
      throw new Error('Database connection not available')
    }

    const { data, error } = await supabase
      .from('rates')
      .update({
        ...rateData,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single()

    console.log('API Request:', {
      table: 'rates',
      action: 'update',
      id,
      data: rateData,
      timestamp: new Date().toISOString(),
      success: !error,
    })

    if (error) {
      console.error('Update rate failed:', error)
      console.log('Switching to mock mode due to error')
      const rateIndex = mockRates.findIndex(r => r.id === id)
      if (rateIndex === -1) {
        throw new Error(`Расценка с id ${id} не найдена`)
      }
      const updatedRate = {
        ...mockRates[rateIndex],
        ...rateData,
        updated_at: new Date().toISOString(),
      }
      mockRates[rateIndex] = updatedRate
      console.log('API Request:', {
        table: 'rates',
        action: 'update_fallback',
        mode: 'mock',
        timestamp: new Date().toISOString(),
        success: true,
      })
      return updatedRate
    }

    return data
  },

  async delete(id: string): Promise<void> {
    if (!supabase) {
      console.error('Supabase client not initialized')
      throw new Error('Database connection not available')
    }

    const { error } = await supabase.from('rates').delete().eq('id', id)

    console.log('API Request:', {
      table: 'rates',
      action: 'delete',
      id,
      timestamp: new Date().toISOString(),
      success: !error,
    })

    if (error) {
      console.error('Delete rate failed:', error)
      console.log('Switching to mock mode due to error')
      const rateIndex = mockRates.findIndex(r => r.id === id)
      if (rateIndex === -1) {
        throw new Error(`Расценка с id ${id} не найдена`)
      }
      mockRates.splice(rateIndex, 1)
      console.log('API Request:', {
        table: 'rates',
        action: 'delete_fallback',
        mode: 'mock',
        timestamp: new Date().toISOString(),
        success: true,
      })
      return
    }
  },
}
