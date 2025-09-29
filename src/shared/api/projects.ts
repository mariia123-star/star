import { supabase } from '../../lib/supabase'

export type ProjectStatus =
  | 'планируется'
  | 'в_работе'
  | 'завершен'
  | 'приостановлен'

export interface Project {
  id: string
  name: string
  description?: string
  start_date?: string
  end_date?: string
  status: ProjectStatus
  budget: number
  responsible_person?: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface CreateProjectData {
  name: string
  description?: string
  start_date?: string
  end_date?: string
  status?: ProjectStatus
  budget?: number
  responsible_person?: string
}

export interface UpdateProjectData {
  name?: string
  description?: string
  start_date?: string
  end_date?: string
  status?: ProjectStatus
  budget?: number
  responsible_person?: string
  is_active?: boolean
}

console.log('API Request:', {
  table: 'projects',
  action: 'init',
  timestamp: new Date().toISOString(),
})

// Mock user IDs for development when Supabase is not available
const mockUserIds = {
  ivanov: 'user-1',
  petrova: 'user-2',
  sidorov: 'user-3',
}

// Mock data for development when Supabase is not available
const mockProjects: Project[] = [
  {
    id: '1',
    name: 'Реконструкция офисного здания',
    description:
      'Полная реконструкция главного офисного здания с модернизацией инфраструктуры',
    start_date: '2025-01-01',
    end_date: '2025-06-30',
    status: 'в_работе',
    budget: 15000000,
    responsible_person: mockUserIds.ivanov,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: '2',
    name: 'Строительство производственного цеха',
    description:
      'Строительство нового производственного цеха для расширения производства',
    start_date: '2025-02-01',
    end_date: '2025-12-31',
    status: 'планируется',
    budget: 25000000,
    responsible_person: mockUserIds.petrova,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: '3',
    name: 'Модернизация склада',
    description: 'Обновление складского комплекса и автоматизация процессов',
    start_date: '2024-10-01',
    end_date: '2025-03-31',
    status: 'в_работе',
    budget: 8000000,
    responsible_person: mockUserIds.sidorov,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
]

export const projectsApi = {
  // Получить все проекты
  async getAll(): Promise<Project[]> {
    console.log('API Request:', {
      table: 'projects',
      action: 'select_all',
      timestamp: new Date().toISOString(),
    })

    if (!supabase) {
      console.warn('Supabase client not initialized, using mock data')
      return [...mockProjects]
    }

    try {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false })

      console.log('API Request:', {
        table: 'projects',
        action: 'select_all',
        timestamp: new Date().toISOString(),
        success: !error,
        dataCount: data?.length || 0,
      })

      if (error) {
        console.error('Error fetching projects:', error)
        console.warn('Falling back to mock data')
        return [...mockProjects]
      }

      return data || []
    } catch (error) {
      console.error('Error fetching projects:', error)
      console.warn('Falling back to mock data')
      return [...mockProjects]
    }
  },

  // Получить проект по ID
  async getById(id: string): Promise<Project> {
    console.log('API Request:', {
      table: 'projects',
      action: 'select_by_id',
      timestamp: new Date().toISOString(),
      id,
    })

    if (!supabase) {
      console.warn('Supabase client not initialized, using mock data')
      const project = mockProjects.find(p => p.id === id)
      if (!project) throw new Error('Project not found')
      return project
    }

    try {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('id', id)
        .single()

      console.log('API Request:', {
        table: 'projects',
        action: 'select_by_id',
        timestamp: new Date().toISOString(),
        success: !error,
        id,
      })

      if (error) {
        console.error('Error fetching project:', error)
        const project = mockProjects.find(p => p.id === id)
        if (!project) throw new Error('Project not found')
        return project
      }

      return data
    } catch (error) {
      console.error('Error fetching project:', error)
      const project = mockProjects.find(p => p.id === id)
      if (!project) throw new Error('Project not found')
      return project
    }
  },

  // Создать новый проект
  async create(projectData: CreateProjectData): Promise<Project> {
    console.log('API Request:', {
      table: 'projects',
      action: 'insert',
      timestamp: new Date().toISOString(),
      data: projectData,
    })

    if (!supabase) {
      console.warn('Supabase client not initialized, using mock data')
      const newProject: Project = {
        id: Date.now().toString(),
        ...projectData,
        status: projectData.status || 'планируется',
        budget: projectData.budget || 0,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }
      mockProjects.push(newProject)
      console.log('Mock project created:', newProject)
      return newProject
    }

    try {
      const { data, error } = await supabase
        .from('projects')
        .insert([projectData])
        .select()
        .single()

      console.log('API Request:', {
        table: 'projects',
        action: 'insert',
        timestamp: new Date().toISOString(),
        success: !error,
        data: projectData,
      })

      if (error) {
        console.error('Error creating project:', error)
        console.warn('Creating mock project instead')
        const newProject: Project = {
          id: Date.now().toString(),
          ...projectData,
          status: projectData.status || 'планируется',
          budget: projectData.budget || 0,
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }
        mockProjects.push(newProject)
        return newProject
      }

      return data
    } catch (error) {
      console.error('Error creating project:', error)
      console.warn('Creating mock project instead')
      const newProject: Project = {
        id: Date.now().toString(),
        ...projectData,
        status: projectData.status || 'планируется',
        budget: projectData.budget || 0,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }
      mockProjects.push(newProject)
      return newProject
    }
  },

  // Обновить проект
  async update(id: string, projectData: UpdateProjectData): Promise<Project> {
    console.log('API Request:', {
      table: 'projects',
      action: 'update',
      timestamp: new Date().toISOString(),
      id,
      data: projectData,
    })

    if (!supabase) {
      console.warn('Supabase client not initialized, updating mock data')
      const projectIndex = mockProjects.findIndex(p => p.id === id)
      if (projectIndex !== -1) {
        mockProjects[projectIndex] = {
          ...mockProjects[projectIndex],
          ...projectData,
          updated_at: new Date().toISOString(),
        }
        console.log('Mock project updated:', mockProjects[projectIndex])
        return mockProjects[projectIndex]
      }
      throw new Error('Project not found')
    }

    try {
      const { data, error } = await supabase
        .from('projects')
        .update(projectData)
        .eq('id', id)
        .select()
        .single()

      console.log('API Request:', {
        table: 'projects',
        action: 'update',
        timestamp: new Date().toISOString(),
        success: !error,
        id,
        data: projectData,
      })

      if (error) {
        console.error('Error updating project:', error)
        console.warn('Updating mock data instead')
        const projectIndex = mockProjects.findIndex(p => p.id === id)
        if (projectIndex !== -1) {
          mockProjects[projectIndex] = {
            ...mockProjects[projectIndex],
            ...projectData,
            updated_at: new Date().toISOString(),
          }
          return mockProjects[projectIndex]
        }
        throw new Error('Project not found')
      }

      return data
    } catch (error) {
      console.error('Error updating project:', error)
      console.warn('Updating mock data instead')
      const projectIndex = mockProjects.findIndex(p => p.id === id)
      if (projectIndex !== -1) {
        mockProjects[projectIndex] = {
          ...mockProjects[projectIndex],
          ...projectData,
          updated_at: new Date().toISOString(),
        }
        return mockProjects[projectIndex]
      }
      throw new Error('Project not found')
    }
  },

  // Мягкое удаление проекта (деактивация)
  async delete(id: string): Promise<void> {
    console.log('API Request:', {
      table: 'projects',
      action: 'soft_delete',
      timestamp: new Date().toISOString(),
      id,
    })

    if (!supabase) {
      console.warn('Supabase client not initialized, deleting from mock data')
      const projectIndex = mockProjects.findIndex(project => project.id === id)
      if (projectIndex !== -1) {
        mockProjects[projectIndex].is_active = false
        console.log('Mock project deactivated:', mockProjects[projectIndex])
      }
      return
    }

    try {
      const { error } = await supabase
        .from('projects')
        .update({ is_active: false })
        .eq('id', id)

      console.log('API Request:', {
        table: 'projects',
        action: 'soft_delete',
        timestamp: new Date().toISOString(),
        success: !error,
        id,
      })

      if (error) {
        console.error('Error deleting project:', error)
        console.warn('Deleting from mock data instead')
        const projectIndex = mockProjects.findIndex(
          project => project.id === id
        )
        if (projectIndex !== -1) {
          mockProjects[projectIndex].is_active = false
          console.log('Mock project deactivated:', mockProjects[projectIndex])
        }
        return
      }
    } catch (error) {
      console.error('Error deleting project:', error)
      console.warn('Deleting from mock data instead')
      const projectIndex = mockProjects.findIndex(project => project.id === id)
      if (projectIndex !== -1) {
        mockProjects[projectIndex].is_active = false
        console.log('Mock project deactivated:', mockProjects[projectIndex])
      }
    }
  },
}
