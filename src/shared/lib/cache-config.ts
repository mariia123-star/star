// Конфигурация кеширования для портала STAR
// Оптимизация производительности для больших объемов данных

export const CACHE_KEYS = {
  // Справочники - долгое время жизни (1 час)
  UNITS: 'portal_star:units',
  PROJECTS: 'portal_star:projects',
  COST_CATEGORIES: 'portal_star:cost_categories',
  BLOCKS: 'portal_star:blocks',

  // Основные данные - среднее время жизни (5 минут)
  TENDER_ESTIMATES: 'portal_star:tender_estimates',
  PROJECT_ANALYTICS: 'portal_star:project_analytics',

  // Поиск - короткое время жизни (1 минута)
  SEARCH_RESULTS: 'portal_star:search',

  // Материализованные представления
  MV_TENDER_ESTIMATES: 'portal_star:mv_tender_estimates',
} as const

export const CACHE_TTL = {
  // В секундах
  REFERENCE_DATA: 3600, // 1 час - справочники
  MAIN_DATA: 300, // 5 минут - основные данные
  SEARCH_DATA: 60, // 1 минута - результаты поиска
  SESSION_DATA: 1800, // 30 минут - данные сессии
  ANALYTICS: 900, // 15 минут - аналитика
} as const

// Конфигурация TanStack Query для клиентского кеширования
export const QUERY_OPTIONS = {
  // Справочники - редко изменяются
  references: {
    staleTime: 1000 * 60 * 30, // 30 минут
    cacheTime: 1000 * 60 * 60, // 1 час
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  },

  // Основные данные - часто изменяются
  mainData: {
    staleTime: 1000 * 60 * 2, // 2 минуты
    cacheTime: 1000 * 60 * 10, // 10 минут
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  },

  // Поиск - мгновенно устаревает
  search: {
    staleTime: 0, // Всегда устаревший
    cacheTime: 1000 * 60 * 5, // 5 минут в памяти
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  },

  // Аналитика - средняя свежесть
  analytics: {
    staleTime: 1000 * 60 * 5, // 5 минут
    cacheTime: 1000 * 60 * 15, // 15 минут
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
  },
} as const

// Утилиты для работы с кешем
export const cacheUtils = {
  // Генерация ключа кеша с параметрами
  generateKey: (baseKey: string, params: Record<string, any> = {}): string => {
    const paramString = Object.keys(params)
      .sort()
      .map(key => `${key}:${params[key]}`)
      .join('|')

    return paramString ? `${baseKey}:${paramString}` : baseKey
  },

  // Генерация ключа для поиска
  generateSearchKey: (
    searchText: string,
    filters: Record<string, any> = {}
  ): string => {
    const searchHash = window
      .btoa(searchText)
      .replace(/[/+=]/g, '')
      .substring(0, 8)
    return cacheUtils.generateKey(
      `${CACHE_KEYS.SEARCH_RESULTS}:${searchHash}`,
      filters
    )
  },

  // Инвалидация связанных ключей
  getInvalidationKeys: (changedTable: string): string[] => {
    const invalidationMap: Record<string, string[]> = {
      tender_estimates: [
        CACHE_KEYS.TENDER_ESTIMATES,
        CACHE_KEYS.PROJECT_ANALYTICS,
        CACHE_KEYS.SEARCH_RESULTS,
        CACHE_KEYS.MV_TENDER_ESTIMATES,
      ],
      projects: [
        CACHE_KEYS.PROJECTS,
        CACHE_KEYS.PROJECT_ANALYTICS,
        CACHE_KEYS.TENDER_ESTIMATES,
      ],
      units: [CACHE_KEYS.UNITS, CACHE_KEYS.TENDER_ESTIMATES],
      cost_categories: [
        CACHE_KEYS.COST_CATEGORIES,
        CACHE_KEYS.TENDER_ESTIMATES,
      ],
    }

    return invalidationMap[changedTable] || []
  },
}

// Конфигурация батчинга для массовых операций
export const BATCH_CONFIG = {
  IMPORT_BATCH_SIZE: 1000, // Размер батча для импорта
  UPDATE_BATCH_SIZE: 500, // Размер батча для обновлений
  DELETE_BATCH_SIZE: 200, // Размер батча для удалений
  RENDER_BATCH_SIZE: 100, // Размер батча для рендеринга

  // Таймауты для операций
  IMPORT_TIMEOUT: 30000, // 30 секунд на импорт
  QUERY_TIMEOUT: 5000, // 5 секунд на обычный запрос
  SEARCH_TIMEOUT: 3000, // 3 секунды на поиск
} as const

// Настройки оптимистичного обновления
export const OPTIMISTIC_UPDATE_CONFIG = {
  // Операции, которые можно выполнить оптимистично
  SAFE_OPERATIONS: ['update_status', 'update_notes', 'soft_delete'],

  // Операции, требующие подтверждения с сервера
  CRITICAL_OPERATIONS: [
    'create',
    'hard_delete',
    'bulk_import',
    'calculate_totals',
  ],
} as const

// Метрики производительности
export const PERFORMANCE_THRESHOLDS = {
  SLOW_QUERY_MS: 1000, // Медленный запрос > 1 сек
  VERY_SLOW_QUERY_MS: 5000, // Очень медленный запрос > 5 сек

  ACCEPTABLE_IMPORT_TIME_MS: 30000, // Приемлемое время импорта 30 сек
  TARGET_RENDER_TIME_MS: 100, // Целевое время рендеринга 100 мс

  MAX_CONCURRENT_REQUESTS: 5, // Максимум одновременных запросов от одного клиента

  // Размеры данных для предупреждений
  LARGE_DATASET_ROWS: 5000, // Большой набор данных > 5k строк
  HUGE_DATASET_ROWS: 10000, // Огромный набор данных > 10k строк
} as const

// Конфигурация для различных сред
export const getEnvironmentConfig = () => {
  const isDevelopment = process.env.NODE_ENV === 'development'
  const isProduction = process.env.NODE_ENV === 'production'

  return {
    // В development кеш менее агрессивный для удобства отладки
    cacheMultiplier: isDevelopment ? 0.5 : 1,

    // В production включаем все оптимизации
    enableOptimizations: isProduction,

    // Логирование производительности
    enablePerformanceLogging:
      isDevelopment || process.env.VITE_ENABLE_PERF_LOGGING === 'true',

    // Размеры батчей
    batchSizes: {
      import: isDevelopment ? 100 : BATCH_CONFIG.IMPORT_BATCH_SIZE,
      render: isDevelopment ? 50 : BATCH_CONFIG.RENDER_BATCH_SIZE,
    },
  }
}

// Типы для TypeScript
export interface CacheConfig {
  key: string
  ttl: number
  staleWhileRevalidate?: boolean
  tags?: string[]
}

export interface QueryFilters {
  projectId?: string
  isActive?: boolean
  dateRange?: {
    from: string
    to: string
  }
  search?: string
  limit?: number
  offset?: number
}

export interface BatchOperation<T> {
  operation: 'create' | 'update' | 'delete'
  data: T[]
  batchSize?: number
  onProgress?: (processed: number, total: number) => void
  onError?: (error: Error, batch: T[]) => void
}

// Экспорт конфигурации по умолчанию
export default {
  CACHE_KEYS,
  CACHE_TTL,
  QUERY_OPTIONS,
  cacheUtils,
  BATCH_CONFIG,
  OPTIMISTIC_UPDATE_CONFIG,
  PERFORMANCE_THRESHOLDS,
  getEnvironmentConfig,
}
