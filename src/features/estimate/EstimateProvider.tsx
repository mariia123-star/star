import React, {
  createContext,
  useContext,
  useReducer,
  useCallback,
  useEffect,
} from 'react'
import { message } from 'antd'
import {
  EstimateContextType,
  EstimateItem,
  EstimateCalculations,
  EstimateAnalytics,
  EstimateFilters,
  EstimateSortConfig,
  EstimateModification,
  CSVParseResult,
} from '@/shared/types/estimate'
import { EstimateCalculator } from '@/shared/lib/calculations'
import { CSVParser } from '@/shared/lib/csvParser'

interface EstimateState {
  items: EstimateItem[]
  filteredItems: EstimateItem[]
  calculations: EstimateCalculations
  analytics: EstimateAnalytics
  filters: EstimateFilters
  sortConfig: EstimateSortConfig
  modifications: EstimateModification[]
  selectedProjectId: string | null
  isLoading: boolean
  error: string | null
}

type EstimateAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_ITEMS'; payload: EstimateItem[] }
  | {
      type: 'UPDATE_ITEM'
      payload: { id: string; updates: Partial<EstimateItem> }
    }
  | { type: 'ADD_ITEM'; payload: EstimateItem }
  | { type: 'REMOVE_ITEM'; payload: string }
  | { type: 'TOGGLE_EXPANDED'; payload: string }
  | { type: 'SET_FILTERS'; payload: Partial<EstimateFilters> }
  | { type: 'SET_SORT_CONFIG'; payload: EstimateSortConfig }
  | { type: 'ADD_MODIFICATION'; payload: EstimateModification }
  | { type: 'SET_PROJECT'; payload: string | null }
  | { type: 'CLEAR_DATA' }
  | { type: 'APPLY_VOLUME_CHANGE'; payload: number }
  | {
      type: 'APPLY_PRICE_CHANGE'
      payload: {
        field: 'workPrice' | 'materialPriceWithVAT' | 'deliveryPrice'
        percentage: number
      }
    }

const initialState: EstimateState = {
  items: [],
  filteredItems: [],
  calculations: {
    totalSum: 0,
    totalVolume: 0,
    totalMaterialCost: 0,
    totalWorkCost: 0,
    totalDeliveryCost: 0,
    itemsCount: 0,
  },
  analytics: {
    byContractor: [],
    byMaterialType: [],
    byUnit: [],
    topExpensiveItems: [],
    topVolumeItems: [],
  },
  filters: {
    search: '',
    contractor: undefined,
    materialType: undefined,
    unit: undefined,
    minVolume: undefined,
    maxVolume: undefined,
    minTotal: undefined,
    maxTotal: undefined,
  },
  sortConfig: {
    field: 'number',
    direction: 'asc',
  },
  modifications: [],
  selectedProjectId: null,
  isLoading: false,
  error: null,
}

const EstimateContext = createContext<EstimateContextType | undefined>(
  undefined
)

function estimateReducer(
  state: EstimateState,
  action: EstimateAction
): EstimateState {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload }

    case 'SET_ERROR':
      return { ...state, error: action.payload, isLoading: false }

    case 'SET_ITEMS': {
      const items = action.payload
      const calculations = EstimateCalculator.calculateTotals(items)
      const analytics = EstimateCalculator.generateAnalytics(items)
      const filteredItems = applyFilters(items, state.filters, state.sortConfig)

      return {
        ...state,
        items,
        filteredItems,
        calculations,
        analytics,
        isLoading: false,
        error: null,
      }
    }

    case 'UPDATE_ITEM': {
      const updateItemRecursive = (items: EstimateItem[]): EstimateItem[] => {
        return items.map(item => {
          if (item.id === action.payload.id) {
            return { ...item, ...action.payload.updates }
          }
          if (item.children) {
            return { ...item, children: updateItemRecursive(item.children) }
          }
          return item
        })
      }

      const updatedItems = updateItemRecursive(state.items)
      const calculations = EstimateCalculator.calculateTotals(updatedItems)
      const analytics = EstimateCalculator.generateAnalytics(updatedItems)
      const filteredItems = applyFilters(
        updatedItems,
        state.filters,
        state.sortConfig
      )

      return {
        ...state,
        items: updatedItems,
        filteredItems,
        calculations,
        analytics,
      }
    }

    case 'TOGGLE_EXPANDED': {
      const toggleItemRecursive = (items: EstimateItem[]): EstimateItem[] => {
        return items.map(item => {
          if (item.id === action.payload) {
            return { ...item, isExpanded: !item.isExpanded }
          }
          if (item.children) {
            return { ...item, children: toggleItemRecursive(item.children) }
          }
          return item
        })
      }

      const updatedItems = toggleItemRecursive(state.items)
      const filteredItems = applyFilters(
        updatedItems,
        state.filters,
        state.sortConfig
      )

      return {
        ...state,
        items: updatedItems,
        filteredItems,
      }
    }

    case 'SET_FILTERS': {
      const newFilters = { ...state.filters, ...action.payload }
      const filteredItems = applyFilters(
        state.items,
        newFilters,
        state.sortConfig
      )

      return {
        ...state,
        filters: newFilters,
        filteredItems,
      }
    }

    case 'SET_SORT_CONFIG': {
      const filteredItems = applyFilters(
        state.items,
        state.filters,
        action.payload
      )

      return {
        ...state,
        sortConfig: action.payload,
        filteredItems,
      }
    }

    case 'ADD_MODIFICATION':
      return {
        ...state,
        modifications: [action.payload, ...state.modifications],
      }

    case 'SET_PROJECT':
      return {
        ...state,
        selectedProjectId: action.payload,
      }

    case 'APPLY_VOLUME_CHANGE': {
      const updatedItems = EstimateCalculator.applyVolumeChange(
        state.items,
        action.payload
      )
      const calculations = EstimateCalculator.calculateTotals(updatedItems)
      const analytics = EstimateCalculator.generateAnalytics(updatedItems)
      const filteredItems = applyFilters(
        updatedItems,
        state.filters,
        state.sortConfig
      )

      return {
        ...state,
        items: updatedItems,
        filteredItems,
        calculations,
        analytics,
      }
    }

    case 'APPLY_PRICE_CHANGE': {
      const updatedItems = EstimateCalculator.applyPriceChange(
        state.items,
        action.payload.field,
        action.payload.percentage
      )
      const calculations = EstimateCalculator.calculateTotals(updatedItems)
      const analytics = EstimateCalculator.generateAnalytics(updatedItems)
      const filteredItems = applyFilters(
        updatedItems,
        state.filters,
        state.sortConfig
      )

      return {
        ...state,
        items: updatedItems,
        filteredItems,
        calculations,
        analytics,
      }
    }

    case 'CLEAR_DATA':
      return { ...initialState }

    default:
      return state
  }
}

function applyFilters(
  items: EstimateItem[],
  _filters: EstimateFilters,
  _sortConfig: EstimateSortConfig
): EstimateItem[] {
  // Для простоты возвращаем все элементы
  // В реальном приложении здесь была бы логика фильтрации
  return items
}

interface EstimateProviderProps {
  children: React.ReactNode
}

export const EstimateProvider: React.FC<EstimateProviderProps> = ({
  children,
}) => {
  const [state, dispatch] = useReducer(estimateReducer, initialState)

  const loadFromCSV = useCallback(async (file: globalThis.File) => {
    console.log('EstimateProvider: Загружаем данные из CSV', {
      fileName: file.name,
      timestamp: new Date().toISOString(),
    })

    dispatch({ type: 'SET_LOADING', payload: true })

    try {
      const result: CSVParseResult = await CSVParser.parseFile(file)

      if (result.errors.length > 0) {
        message.warning(
          `Файл загружен с предупреждениями: ${result.errors.length} ошибок`
        )
      }

      dispatch({ type: 'SET_ITEMS', payload: result.data })

      console.log('EstimateProvider: Данные успешно загружены', {
        itemsCount: result.data.length,
        errorsCount: result.errors.length,
      })
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Неизвестная ошибка'
      dispatch({ type: 'SET_ERROR', payload: errorMessage })
      console.error('EstimateProvider: Ошибка загрузки данных', error)
    }
  }, [])

  const updateItem = useCallback(
    (id: string, updates: Partial<EstimateItem>) => {
      console.log('EstimateProvider: Обновляем позицию', {
        itemId: id,
        updates,
        timestamp: new Date().toISOString(),
      })

      // Создаем запись об изменении
      const modification: EstimateModification = {
        id: `mod_${Date.now()}_${Math.random()}`,
        itemId: id,
        field: Object.keys(updates)[0] as keyof EstimateItem,
        oldValue: 'unknown', // В реальном приложении нужно получить старое значение
        newValue: Object.values(updates)[0],
        timestamp: new Date(),
        description: `Изменение позиции ${id}`,
      }

      dispatch({ type: 'UPDATE_ITEM', payload: { id, updates } })
      dispatch({ type: 'ADD_MODIFICATION', payload: modification })
    },
    []
  )

  const addItem = useCallback((item: Omit<EstimateItem, 'id'>) => {
    const newItem: EstimateItem = {
      ...item,
      id: `item_${Date.now()}_${Math.random()}`,
    }

    console.log('EstimateProvider: Добавляем новую позицию', {
      itemId: newItem.id,
      timestamp: new Date().toISOString(),
    })

    dispatch({ type: 'ADD_ITEM', payload: newItem })
  }, [])

  const removeItem = useCallback((id: string) => {
    console.log('EstimateProvider: Удаляем позицию', {
      itemId: id,
      timestamp: new Date().toISOString(),
    })

    dispatch({ type: 'REMOVE_ITEM', payload: id })
  }, [])

  const toggleExpanded = useCallback((id: string) => {
    console.log('EstimateProvider: Переключаем развернутость позиции', {
      itemId: id,
      timestamp: new Date().toISOString(),
    })

    dispatch({ type: 'TOGGLE_EXPANDED', payload: id })
  }, [])

  const setFilters = useCallback((filters: Partial<EstimateFilters>) => {
    console.log('EstimateProvider: Устанавливаем фильтры', {
      filters,
      timestamp: new Date().toISOString(),
    })

    dispatch({ type: 'SET_FILTERS', payload: filters })
  }, [])

  const setSortConfig = useCallback((config: EstimateSortConfig) => {
    console.log('EstimateProvider: Устанавливаем сортировку', {
      config,
      timestamp: new Date().toISOString(),
    })

    dispatch({ type: 'SET_SORT_CONFIG', payload: config })
  }, [])

  const clearData = useCallback(() => {
    console.log('EstimateProvider: Очищаем все данные', {
      timestamp: new Date().toISOString(),
    })

    dispatch({ type: 'CLEAR_DATA' })
  }, [])

  const undoModification = useCallback((modificationId: string) => {
    console.log('EstimateProvider: Отменяем изменение', {
      modificationId,
      timestamp: new Date().toISOString(),
    })

    // В реальном приложении здесь была бы логика отмены изменений
  }, [])

  const _applyVolumeChange = useCallback((percentage: number) => {
    console.log('EstimateProvider: Применяем изменение объемов', {
      percentage,
      timestamp: new Date().toISOString(),
    })

    dispatch({ type: 'APPLY_VOLUME_CHANGE', payload: percentage })
  }, [])

  const _applyPriceChange = useCallback(
    (
      field: 'workPrice' | 'materialPriceWithVAT' | 'deliveryPrice',
      percentage: number
    ) => {
      console.log('EstimateProvider: Применяем изменение цен', {
        field,
        percentage,
        timestamp: new Date().toISOString(),
      })

      dispatch({ type: 'APPLY_PRICE_CHANGE', payload: { field, percentage } })
    },
    []
  )

  const setSelectedProject = useCallback((projectId: string | null) => {
    console.log('EstimateProvider: Устанавливаем проект', {
      projectId,
      timestamp: new Date().toISOString(),
    })

    dispatch({ type: 'SET_PROJECT', payload: projectId })
  }, [])

  // Автосохранение в localStorage
  useEffect(() => {
    if (
      state.items.length > 0 &&
      typeof globalThis !== 'undefined' &&
      globalThis.localStorage
    ) {
      globalThis.localStorage.setItem(
        'estimate_data',
        JSON.stringify(state.items)
      )
      globalThis.localStorage.setItem(
        'estimate_modifications',
        JSON.stringify(state.modifications)
      )
    }
  }, [state.items, state.modifications])

  // Загрузка из localStorage при инициализации
  useEffect(() => {
    const savedItems =
      typeof globalThis !== 'undefined' && globalThis.localStorage
        ? globalThis.localStorage.getItem('estimate_data')
        : null
    const savedModifications =
      typeof globalThis !== 'undefined' && globalThis.localStorage
        ? globalThis.localStorage.getItem('estimate_modifications')
        : null

    if (savedItems) {
      try {
        const items = JSON.parse(savedItems)
        dispatch({ type: 'SET_ITEMS', payload: items })

        if (savedModifications) {
          const modifications = JSON.parse(savedModifications)
          modifications.forEach((mod: EstimateModification) => {
            dispatch({ type: 'ADD_MODIFICATION', payload: mod })
          })
        }

        console.log('EstimateProvider: Данные восстановлены из localStorage', {
          itemsCount: items.length,
          timestamp: new Date().toISOString(),
        })
      } catch (error) {
        console.error('EstimateProvider: Ошибка восстановления данных', error)
      }
    }
  }, [])

  const contextValue: EstimateContextType = {
    ...state,
    loadFromCSV,
    updateItem,
    addItem,
    removeItem,
    toggleExpanded,
    setFilters,
    setSortConfig,
    clearData,
    undoModification: undoModification,
    setSelectedProject,
  }

  return (
    <EstimateContext.Provider value={contextValue}>
      {children}
    </EstimateContext.Provider>
  )
}

export const useEstimate = (): EstimateContextType => {
  const context = useContext(EstimateContext)
  if (context === undefined) {
    throw new Error('useEstimate must be used within an EstimateProvider')
  }
  return context
}

// Дополнительные хуки для удобства
export const useEstimateData = () => {
  const {
    items,
    filteredItems,
    calculations,
    analytics,
    filters,
    modifications,
    selectedProjectId,
    isLoading,
  } = useEstimate()
  return {
    items,
    filteredItems,
    calculations,
    analytics,
    filters,
    modifications,
    selectedProjectId,
    isLoading,
  }
}

export const useEstimateActions = () => {
  const {
    loadFromCSV,
    updateItem,
    addItem,
    removeItem,
    toggleExpanded,
    setFilters,
    setSortConfig,
    clearData,
    undoModification,
    setSelectedProject,
  } = useEstimate()

  return {
    loadFromCSV,
    updateItem,
    addItem,
    removeItem,
    toggleExpanded,
    setFilters,
    setSortConfig,
    clearData,
    undoModification,
    setSelectedProject,
  }
}
