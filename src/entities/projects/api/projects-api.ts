import { supabase } from '@/lib/supabase'

export interface Project {
  id: string
  name: string
  description?: string | null
  start_date?: string | null
  end_date?: string | null
  status: 'планируется' | 'в_работе' | 'завершен' | 'приостановлен'
  budget?: number | null
  responsible_person?: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface ProjectCreate {
  name: string
  description?: string | null
  start_date?: string | null
  end_date?: string | null
  status?: 'планируется' | 'в_работе' | 'завершен' | 'приостановлен'
  budget?: number | null
  responsible_person?: string | null
  is_active?: boolean
}

export interface ProjectUpdate {
  name?: string
  description?: string | null
  start_date?: string | null
  end_date?: string | null
  status?: 'планируется' | 'в_работе' | 'завершен' | 'приостановлен'
  budget?: number | null
  responsible_person?: string | null
  is_active?: boolean
}

export const projectsApi = {
  async getAll(): Promise<Project[]> {
    if (!supabase) {
      console.error('Supabase client not initialized')
      throw new Error('Database connection not available')
    }

    console.log('API Request:', {
      table: 'projects',
      action: 'select',
      timestamp: new Date().toISOString(),
    })

    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false })

    console.log('API Request result:', {
      success: !error,
      dataCount: data?.length || 0,
      error: error?.message,
    })

    if (error) {
      console.error('Failed to fetch projects:', error)
      throw error
    }

    return data || []
  },

  async getById(id: string): Promise<Project | null> {
    if (!supabase) {
      console.error('Supabase client not initialized')
      throw new Error('Database connection not available')
    }

    console.log('API Request:', {
      table: 'projects',
      action: 'select_by_id',
      id,
      timestamp: new Date().toISOString(),
    })

    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .eq('id', id)
      .eq('is_active', true)
      .single()

    if (error) {
      console.error('Failed to fetch project:', error)
      throw error
    }

    return data
  },

  async create(project: ProjectCreate): Promise<Project> {
    if (!supabase) {
      console.error('Supabase client not initialized')
      throw new Error('Database connection not available')
    }

    console.log('API Request:', {
      table: 'projects',
      action: 'create',
      data: project,
      timestamp: new Date().toISOString(),
    })

    const projectData = {
      ...project,
      is_active: project.is_active !== undefined ? project.is_active : true,
    }

    console.log('Sending project data:', projectData)

    const { data, error } = await supabase
      .from('projects')
      .insert(projectData)
      .select()
      .single()

    console.log('API Response:', {
      table: 'projects',
      action: 'create',
      success: !error,
      error: error?.message,
      data: data,
      timestamp: new Date().toISOString(),
    })

    if (error) {
      console.error('Failed to create project:', error)
      throw error
    }

    return data
  },

  async update(id: string, project: ProjectUpdate): Promise<Project> {
    if (!supabase) {
      console.error('Supabase client not initialized')
      throw new Error('Database connection not available')
    }

    console.log('API Request:', {
      table: 'projects',
      action: 'update',
      id,
      timestamp: new Date().toISOString(),
    })

    const { data, error } = await supabase
      .from('projects')
      .update(project)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Failed to update project:', error)
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
      table: 'projects',
      action: 'delete',
      id,
      timestamp: new Date().toISOString(),
    })

    const { error } = await supabase
      .from('projects')
      .update({ is_active: false })
      .eq('id', id)

    if (error) {
      console.error('Failed to delete project:', error)
      throw error
    }
  },
}
