import { supabase } from '@/lib/supabase'

// Типы для системы аудита
export interface AuditLogEntry {
  id: string
  user_id?: string
  session_id?: string
  action_type: 'create' | 'update' | 'delete' | 'view' | 'export' | 'import' | 'login' | 'logout' | 'navigate'
  table_name: string
  record_id?: string
  old_values?: Record<string, any>
  new_values?: Record<string, any>
  changes_summary?: string
  page_url?: string
  user_agent?: string
  ip_address?: string
  created_at: string
}

export interface AuditLogCreate {
  user_id?: string
  session_id?: string
  action_type: AuditLogEntry['action_type']
  table_name: string
  record_id?: string
  old_values?: Record<string, any>
  new_values?: Record<string, any>
  changes_summary?: string
  page_url?: string
  user_agent?: string
  ip_address?: string
}

class AuditLogApi {
  // Создать запись в логе
  async create(logEntry: AuditLogCreate): Promise<AuditLogEntry> {
    console.log('Audit Log API Request: Creating log entry', {
      action: 'create_audit_log',
      actionType: logEntry.action_type,
      tableName: logEntry.table_name,
      recordId: logEntry.record_id,
      timestamp: new Date().toISOString(),
    })

    const { data, error } = await supabase
      .from('portal_audit_log')
      .insert([logEntry])
      .select()
      .single()

    if (error) {
      console.warn('Failed to create audit log entry (table may not exist):', error)
      // Не выбрасываем ошибку, чтобы не нарушать основной функционал
      return {
        id: 'no-audit-table',
        action_type: logEntry.action_type,
        table_name: logEntry.table_name,
        created_at: new Date().toISOString()
      } as AuditLogEntry
    }

    console.log('Audit Log API Response: Entry created successfully', {
      action: 'create_audit_log_response',
      success: true,
      entryId: data?.id,
      timestamp: new Date().toISOString(),
    })

    return data
  }

  // Получить логи с фильтрацией
  async getAll(filters?: {
    user_id?: string
    action_type?: AuditLogEntry['action_type']
    table_name?: string
    record_id?: string
    date_from?: string
    date_to?: string
    limit?: number
    offset?: number
  }): Promise<AuditLogEntry[]> {
    console.log('Audit Log API Request: Getting audit logs', {
      action: 'get_audit_logs',
      filters,
      timestamp: new Date().toISOString(),
    })

    let query = supabase
      .from('portal_audit_log')
      .select('*')
      .order('created_at', { ascending: false })

    if (filters?.user_id) {
      query = query.eq('user_id', filters.user_id)
    }
    if (filters?.action_type) {
      query = query.eq('action_type', filters.action_type)
    }
    if (filters?.table_name) {
      query = query.eq('table_name', filters.table_name)
    }
    if (filters?.record_id) {
      query = query.eq('record_id', filters.record_id)
    }
    if (filters?.date_from) {
      query = query.gte('created_at', filters.date_from)
    }
    if (filters?.date_to) {
      query = query.lte('created_at', filters.date_to)
    }
    if (filters?.limit) {
      query = query.limit(filters.limit)
    }
    if (filters?.offset) {
      query = query.range(filters.offset, (filters.offset + (filters.limit || 50)) - 1)
    }

    const { data, error } = await query

    if (error) {
      console.error('Failed to get audit logs:', error)
      throw error
    }

    console.log('Audit Log API Response: Logs retrieved', {
      action: 'get_audit_logs_response',
      success: true,
      count: data?.length || 0,
      timestamp: new Date().toISOString(),
    })

    return data || []
  }

  // Получить статистику по логам
  async getStatistics(dateFrom?: string, dateTo?: string): Promise<{
    total_actions: number
    actions_by_type: Record<string, number>
    actions_by_table: Record<string, number>
    most_active_users: Array<{ user_id: string; count: number }>
  }> {
    console.log('Audit Log API Request: Getting statistics', {
      action: 'get_audit_statistics',
      dateFrom,
      dateTo,
      timestamp: new Date().toISOString(),
    })

    // Общее количество действий
    let totalQuery = supabase
      .from('portal_audit_log')
      .select('*', { count: 'exact', head: true })

    if (dateFrom) totalQuery = totalQuery.gte('created_at', dateFrom)
    if (dateTo) totalQuery = totalQuery.lte('created_at', dateTo)

    const { count: total_actions, error: totalError } = await totalQuery

    if (totalError) {
      console.error('Failed to get total count:', totalError)
      throw totalError
    }

    // Группировка по типам действий
    let actionsQuery = supabase
      .from('portal_audit_log')
      .select('action_type')

    if (dateFrom) actionsQuery = actionsQuery.gte('created_at', dateFrom)
    if (dateTo) actionsQuery = actionsQuery.lte('created_at', dateTo)

    const { data: actionsData, error: actionsError } = await actionsQuery

    if (actionsError) {
      console.error('Failed to get actions data:', actionsError)
      throw actionsError
    }

    const actions_by_type = actionsData?.reduce((acc, item) => {
      acc[item.action_type] = (acc[item.action_type] || 0) + 1
      return acc
    }, {} as Record<string, number>) || {}

    // Группировка по таблицам
    const actions_by_table = actionsData?.reduce((acc, item) => {
      acc[item.table_name] = (acc[item.table_name] || 0) + 1
      return acc
    }, {} as Record<string, number>) || {}

    console.log('Audit Log API Response: Statistics retrieved', {
      action: 'get_audit_statistics_response',
      success: true,
      totalActions: total_actions,
      timestamp: new Date().toISOString(),
    })

    return {
      total_actions: total_actions || 0,
      actions_by_type,
      actions_by_table,
      most_active_users: [] // TODO: Implement when user system is ready
    }
  }
}

export const auditLogApi = new AuditLogApi()

// Хук для автоматического логирования действий пользователя
export const useAuditLogger = () => {
  // Получаем информацию о браузере
  const getUserAgent = () => typeof window !== 'undefined' ? window.navigator.userAgent : undefined
  const getPageUrl = () => typeof window !== 'undefined' ? window.location.href : undefined
  const getSessionId = () => {
    if (typeof window === 'undefined') return undefined
    let sessionId = sessionStorage.getItem('portal_session_id')
    if (!sessionId) {
      sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      sessionStorage.setItem('portal_session_id', sessionId)
    }
    return sessionId
  }

  const logAction = async (
    action_type: AuditLogEntry['action_type'],
    table_name: string,
    details?: {
      record_id?: string
      old_values?: Record<string, any>
      new_values?: Record<string, any>
      changes_summary?: string
      user_id?: string
    }
  ) => {
    try {
      await auditLogApi.create({
        action_type,
        table_name,
        record_id: details?.record_id,
        old_values: details?.old_values,
        new_values: details?.new_values,
        changes_summary: details?.changes_summary,
        user_id: details?.user_id,
        session_id: getSessionId(),
        page_url: getPageUrl(),
        user_agent: getUserAgent(),
      })
    } catch (error) {
      // Логирование не должно нарушать основной функционал - просто игнорируем ошибки
      console.debug('Audit logging skipped (table may not exist):', { action_type, table_name })
    }
  }

  return { logAction }
}