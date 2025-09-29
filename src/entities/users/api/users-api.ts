import { supabase } from '@/lib/supabase'

export interface User {
  id: string
  full_name: string
  email: string
  role: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface UserCreate {
  full_name: string
  email: string
  role: string
  is_active?: boolean
}

export interface UserUpdate {
  full_name?: string
  email?: string
  role?: string
  is_active?: boolean
}

// Mock data for development when Supabase is not available
const mockUsers: User[] = [
  {
    id: 'user-1',
    full_name: 'Иванов Иван Иванович',
    email: 'ivanov@star-portal.ru',
    role: 'администратор',
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'user-2',
    full_name: 'Петрова Анна Сергеевна',
    email: 'petrova@star-portal.ru',
    role: 'инженер',
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'user-3',
    full_name: 'Сидоров Алексей Михайлович',
    email: 'sidorov@star-portal.ru',
    role: 'инженер',
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
]

export const usersApi = {
  async getAll(): Promise<User[]> {
    console.log('API Request:', {
      table: 'users',
      action: 'select_all',
      timestamp: new Date().toISOString(),
    })

    if (!supabase) {
      console.warn('Supabase client not initialized, using mock data')
      return [...mockUsers]
    }

    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('full_name', { ascending: true })

      console.log('API Response:', {
        table: 'users',
        action: 'select_all',
        success: !error,
        dataCount: data?.length || 0,
        timestamp: new Date().toISOString(),
      })

      if (error) {
        console.error('Users fetch failed, using mock data:', error)
        return [...mockUsers]
      }

      return data || []
    } catch (error) {
      console.error('Users fetch failed, using mock data:', error)
      return [...mockUsers]
    }
  },

  async getById(id: string): Promise<User | null> {
    if (!supabase) {
      console.error('Supabase client not initialized')
      throw new Error('Database connection not available')
    }

    console.log('API Request:', {
      table: 'users',
      action: 'select_by_id',
      id,
      timestamp: new Date().toISOString(),
    })

    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', id)
      .single()

    console.log('API Response:', {
      table: 'users',
      action: 'select_by_id',
      success: !error,
      found: !!data,
      timestamp: new Date().toISOString(),
    })

    if (error) {
      console.error('User fetch failed:', error)
      throw error
    }

    return data
  },

  async create(userData: UserCreate): Promise<User> {
    if (!supabase) {
      console.error('Supabase client not initialized')
      throw new Error('Database connection not available')
    }

    console.log('API Request:', {
      table: 'users',
      action: 'create',
      data: userData,
      timestamp: new Date().toISOString(),
    })

    const { data, error } = await supabase
      .from('users')
      .insert(userData)
      .select()
      .single()

    console.log('API Response:', {
      table: 'users',
      action: 'create',
      success: !error,
      timestamp: new Date().toISOString(),
    })

    if (error) {
      console.error('User create failed:', error)
      throw error
    }

    return data
  },

  async update(id: string, userData: UserUpdate): Promise<User> {
    if (!supabase) {
      console.error('Supabase client not initialized')
      throw new Error('Database connection not available')
    }

    console.log('API Request:', {
      table: 'users',
      action: 'update',
      id,
      data: userData,
      timestamp: new Date().toISOString(),
    })

    const { data, error } = await supabase
      .from('users')
      .update(userData)
      .eq('id', id)
      .select()
      .single()

    console.log('API Response:', {
      table: 'users',
      action: 'update',
      success: !error,
      timestamp: new Date().toISOString(),
    })

    if (error) {
      console.error('User update failed:', error)
      throw error
    }

    return data
  },

  async delete(id: string): Promise<void> {
    if (!supabase) {
      console.error('Supabase client not initialized')
      throw new Error('Database connection not available')
    }

    console.log('API Request:', {
      table: 'users',
      action: 'delete',
      id,
      timestamp: new Date().toISOString(),
    })

    const { error } = await supabase.from('users').delete().eq('id', id)

    console.log('API Response:', {
      table: 'users',
      action: 'delete',
      success: !error,
      timestamp: new Date().toISOString(),
    })

    if (error) {
      console.error('User delete failed:', error)
      throw error
    }
  },

  async getActiveUsers(): Promise<User[]> {
    console.log('API Request:', {
      table: 'users',
      action: 'select_active',
      timestamp: new Date().toISOString(),
    })

    if (!supabase) {
      console.warn('Supabase client not initialized, using mock data')
      return mockUsers.filter(user => user.is_active)
    }

    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('is_active', true)
        .order('full_name', { ascending: true })

      console.log('API Response:', {
        table: 'users',
        action: 'select_active',
        success: !error,
        dataCount: data?.length || 0,
        timestamp: new Date().toISOString(),
      })

      if (error) {
        console.error('Active users fetch failed, using mock data:', error)
        return mockUsers.filter(user => user.is_active)
      }

      return data || []
    } catch (error) {
      console.error('Active users fetch failed, using mock data:', error)
      return mockUsers.filter(user => user.is_active)
    }
  },
}
