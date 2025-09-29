import { supabase } from '../../lib/supabase'

export type UserRole = 'администратор' | 'инженер'

export interface User {
  id: string
  full_name: string
  email: string
  role: UserRole
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface CreateUserData {
  full_name: string
  email: string
  role: UserRole
}

export interface UpdateUserData {
  full_name?: string
  email?: string
  role?: UserRole
  is_active?: boolean
}

console.log('API Request:', {
  table: 'users',
  action: 'init',
  timestamp: new Date().toISOString(),
})

// Mock data for development when Supabase is not available
const mockUsers: User[] = [
  {
    id: '1',
    full_name: 'Иванов Иван Иванович',
    email: 'ivanov@star-portal.ru',
    role: 'администратор',
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: '2',
    full_name: 'Петрова Анна Сергеевна',
    email: 'petrova@star-portal.ru',
    role: 'инженер',
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
]

export const usersApi = {
  // Получить всех пользователей
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
        .eq('is_active', true)
        .order('created_at', { ascending: false })

      console.log('API Request:', {
        table: 'users',
        action: 'select_all',
        timestamp: new Date().toISOString(),
        success: !error,
        dataCount: data?.length || 0,
      })

      if (error) {
        console.error('Error fetching users:', error)
        console.warn('Falling back to mock data')
        return [...mockUsers]
      }

      return data || []
    } catch (error) {
      console.error('Error fetching users:', error)
      console.warn('Falling back to mock data')
      return [...mockUsers]
    }
  },

  // Получить пользователя по ID
  async getById(id: string): Promise<User> {
    console.log('API Request:', {
      table: 'users',
      action: 'select_by_id',
      timestamp: new Date().toISOString(),
      id,
    })

    if (!supabase) {
      console.error('Supabase client not initialized')
      throw new Error('Supabase client not initialized')
    }

    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', id)
      .single()

    console.log('API Request:', {
      table: 'users',
      action: 'select_by_id',
      timestamp: new Date().toISOString(),
      success: !error,
      id,
    })

    if (error) {
      console.error('Error fetching user:', error)
      throw error
    }

    return data
  },

  // Создать нового пользователя
  async create(userData: CreateUserData): Promise<User> {
    console.log('API Request:', {
      table: 'users',
      action: 'insert',
      timestamp: new Date().toISOString(),
      data: userData,
    })

    if (!supabase) {
      console.warn('Supabase client not initialized, using mock data')
      const newUser: User = {
        id: Date.now().toString(),
        ...userData,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }
      mockUsers.push(newUser)
      console.log('Mock user created:', newUser)
      return newUser
    }

    try {
      const { data, error } = await supabase
        .from('users')
        .insert([userData])
        .select()
        .single()

      console.log('API Request:', {
        table: 'users',
        action: 'insert',
        timestamp: new Date().toISOString(),
        success: !error,
        data: userData,
      })

      if (error) {
        console.error('Error creating user:', error)
        console.warn('Creating mock user instead')
        const newUser: User = {
          id: Date.now().toString(),
          ...userData,
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }
        mockUsers.push(newUser)
        return newUser
      }

      return data
    } catch (error) {
      console.error('Error creating user:', error)
      console.warn('Creating mock user instead')
      const newUser: User = {
        id: Date.now().toString(),
        ...userData,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }
      mockUsers.push(newUser)
      return newUser
    }
  },

  // Обновить пользователя
  async update(id: string, userData: UpdateUserData): Promise<User> {
    console.log('API Request:', {
      table: 'users',
      action: 'update',
      timestamp: new Date().toISOString(),
      id,
      data: userData,
    })

    if (!supabase) {
      console.error('Supabase client not initialized')
      throw new Error('Supabase client not initialized')
    }

    const { data, error } = await supabase
      .from('users')
      .update(userData)
      .eq('id', id)
      .select()
      .single()

    console.log('API Request:', {
      table: 'users',
      action: 'update',
      timestamp: new Date().toISOString(),
      success: !error,
      id,
      data: userData,
    })

    if (error) {
      console.error('Error updating user:', error)
      throw error
    }

    return data
  },

  // Мягкое удаление пользователя (деактивация)
  async delete(id: string): Promise<void> {
    console.log('API Request:', {
      table: 'users',
      action: 'soft_delete',
      timestamp: new Date().toISOString(),
      id,
    })

    if (!supabase) {
      console.warn('Supabase client not initialized, deleting from mock data')
      const userIndex = mockUsers.findIndex(user => user.id === id)
      if (userIndex !== -1) {
        mockUsers[userIndex].is_active = false
        console.log('Mock user deactivated:', mockUsers[userIndex])
      }
      return
    }

    try {
      const { error } = await supabase
        .from('users')
        .update({ is_active: false })
        .eq('id', id)

      console.log('API Request:', {
        table: 'users',
        action: 'soft_delete',
        timestamp: new Date().toISOString(),
        success: !error,
        id,
      })

      if (error) {
        console.error('Error deleting user:', error)
        console.warn('Deleting from mock data instead')
        const userIndex = mockUsers.findIndex(user => user.id === id)
        if (userIndex !== -1) {
          mockUsers[userIndex].is_active = false
          console.log('Mock user deactivated:', mockUsers[userIndex])
        }
        return
      }
    } catch (error) {
      console.error('Error deleting user:', error)
      console.warn('Deleting from mock data instead')
      const userIndex = mockUsers.findIndex(user => user.id === id)
      if (userIndex !== -1) {
        mockUsers[userIndex].is_active = false
        console.log('Mock user deactivated:', mockUsers[userIndex])
      }
    }
  },
}
