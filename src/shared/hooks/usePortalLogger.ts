import { useCallback } from 'react'
import { auditLogApi, type AuditLogEntry } from '@/shared/api/audit-log-api'

// Хук для логирования действий пользователей на портале
export const usePortalLogger = () => {
  // Получение информации о сессии
  const getSessionInfo = useCallback(() => {
    if (typeof window === 'undefined') return {}

    let sessionId = window.sessionStorage.getItem('portal_session_id')
    if (!sessionId) {
      sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      window.sessionStorage.setItem('portal_session_id', sessionId)
    }

    return {
      session_id: sessionId,
      page_url: window.location.href,
      user_agent: window.navigator.userAgent,
    }
  }, [])

  // Основная функция логирования
  const logAction = useCallback(
    async (
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
        const sessionInfo = getSessionInfo()

        console.log('Portal Logger: Logging user action', {
          action: 'user_action_logged',
          action_type,
          table_name,
          record_id: details?.record_id,
          changes_summary: details?.changes_summary,
          timestamp: new Date().toISOString(),
        })

        await auditLogApi.create({
          action_type,
          table_name,
          record_id: details?.record_id,
          old_values: details?.old_values,
          new_values: details?.new_values,
          changes_summary: details?.changes_summary,
          user_id: details?.user_id,
          ...sessionInfo,
        })
      } catch (error) {
        // Логирование не должно нарушать основной функционал
        console.warn('Portal Logger: Failed to log user action:', {
          error,
          action_type,
          table_name,
          timestamp: new Date().toISOString(),
        })
      }
    },
    [getSessionInfo]
  )

  // Специализированные функции логирования для разных действий
  const logCreate = useCallback(
    (
      table_name: string,
      record_id: string,
      new_values: Record<string, any>,
      changes_summary?: string
    ) => {
      logAction('create', table_name, {
        record_id,
        new_values,
        changes_summary:
          changes_summary || `Создана новая запись в таблице ${table_name}`,
      })
    },
    [logAction]
  )

  const logUpdate = useCallback(
    (
      table_name: string,
      record_id: string,
      old_values: Record<string, any>,
      new_values: Record<string, any>,
      changes_summary?: string
    ) => {
      logAction('update', table_name, {
        record_id,
        old_values,
        new_values,
        changes_summary:
          changes_summary || `Обновлена запись в таблице ${table_name}`,
      })
    },
    [logAction]
  )

  const logDelete = useCallback(
    (
      table_name: string,
      record_id: string,
      old_values: Record<string, any>,
      changes_summary?: string
    ) => {
      logAction('delete', table_name, {
        record_id,
        old_values,
        changes_summary:
          changes_summary || `Удалена запись из таблицы ${table_name}`,
      })
    },
    [logAction]
  )

  const logView = useCallback(
    (table_name: string, record_id?: string, changes_summary?: string) => {
      logAction('view', table_name, {
        record_id,
        changes_summary:
          changes_summary || `Просмотр данных в таблице ${table_name}`,
      })
    },
    [logAction]
  )

  const logExport = useCallback(
    (
      table_name: string,
      export_format?: string,
      record_count?: number,
      changes_summary?: string
    ) => {
      logAction('export', table_name, {
        new_values: { export_format, record_count },
        changes_summary:
          changes_summary || `Экспорт данных из таблицы ${table_name}`,
      })
    },
    [logAction]
  )

  const logImport = useCallback(
    (
      table_name: string,
      import_format?: string,
      record_count?: number,
      changes_summary?: string
    ) => {
      logAction('import', table_name, {
        new_values: { import_format, record_count },
        changes_summary:
          changes_summary || `Импорт данных в таблицу ${table_name}`,
      })
    },
    [logAction]
  )

  const logNavigate = useCallback(
    (page_name: string, from_page?: string, changes_summary?: string) => {
      logAction('navigate', 'navigation', {
        old_values: from_page ? { from_page } : undefined,
        new_values: { to_page: page_name },
        changes_summary: changes_summary || `Переход на страницу ${page_name}`,
      })
    },
    [logAction]
  )

  // Логирование нажатий кнопок и действий пользователя
  const logButtonClick = useCallback(
    (
      button_name: string,
      page_context?: string,
      additional_data?: Record<string, any>
    ) => {
      logAction('view', 'user_interaction', {
        new_values: {
          interaction_type: 'button_click',
          button_name,
          page_context,
          ...additional_data,
        },
        changes_summary: `Нажата кнопка "${button_name}"${page_context ? ` на странице ${page_context}` : ''}`,
      })
    },
    [logAction]
  )

  const logFormSubmit = useCallback(
    (
      form_name: string,
      form_data?: Record<string, any>,
      page_context?: string
    ) => {
      logAction('create', 'user_interaction', {
        new_values: {
          interaction_type: 'form_submit',
          form_name,
          form_data,
          page_context,
        },
        changes_summary: `Отправлена форма "${form_name}"${page_context ? ` на странице ${page_context}` : ''}`,
      })
    },
    [logAction]
  )

  return {
    logAction,
    logCreate,
    logUpdate,
    logDelete,
    logView,
    logExport,
    logImport,
    logNavigate,
    logButtonClick,
    logFormSubmit,
  }
}
