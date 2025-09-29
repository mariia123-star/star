export interface EstimatePosition {
  id: string
  number: string // 1, 1.1, 2, 2.1, etc.
  parentId?: string
  justification: 'подрядчик' | 'раб' | 'мат'
  materialType?: 'основа' | 'вспом'
  workName: string
  unit: string
  volume: number
  materialNorm?: number
  workPrice: number
  materialPrice?: number
  deliveryPrice?: number
  total: number
  level: number
  expanded?: boolean
  children?: EstimatePosition[]
  comments?: string
  isEdited?: boolean
  created_at: string
  updated_at?: string
}

export interface EstimateProject {
  id: string
  name: string
  description?: string
  positions: EstimatePosition[]
  totalAmount: number
  totalWithoutVAT: number
  totalVAT: number
  vatRate: number
  created_at: string
  updated_at?: string
}

export interface EstimateSummary {
  contractorTotal: number
  workTotal: number
  materialTotal: number
  deliveryTotal: number
  grandTotal: number
  positionsCount: number
  vatAmount: number
  totalWithVAT: number
}

export interface EstimateFilter {
  justification?: 'подрядчик' | 'раб' | 'мат' | 'all'
  materialType?: 'основа' | 'вспом' | 'all'
  searchTerm?: string
  showOnlyEdited?: boolean
  minAmount?: number
  maxAmount?: number
}

export interface EstimateSortConfig {
  field: keyof EstimatePosition
  direction: 'asc' | 'desc'
}

export interface EstimateImportResult {
  success: boolean
  positions: EstimatePosition[]
  errors: string[]
  totalRows: number
  importedRows: number
}

export interface EstimateValidationError {
  positionId: string
  field: keyof EstimatePosition
  message: string
  severity: 'error' | 'warning' | 'info'
}

export interface EstimateAction {
  type: 'add' | 'edit' | 'delete' | 'move' | 'calculate'
  positionId: string
  data?: Partial<EstimatePosition>
  timestamp: string
  userId?: string
}

export interface EstimateExportOptions {
  format: 'csv' | 'excel' | 'pdf'
  includeHierarchy: boolean
  includeCalculations: boolean
  includeComments: boolean
  filename?: string
  // Дополнительные поля для совместимости
  includeFilters?: boolean
}

export interface EstimateCalculationRule {
  field: keyof EstimatePosition
  formula: string
  dependencies: (keyof EstimatePosition)[]
}

export interface EstimateTemplate {
  id: string
  name: string
  description?: string
  positions: Omit<EstimatePosition, 'id' | 'total' | 'created_at'>[]
  created_at: string
}

export interface EstimateState {
  project: EstimateProject | null
  positions: EstimatePosition[]
  summary: EstimateSummary
  filter: EstimateFilter
  selectedPositions: string[]
  isLoading: boolean
  errors: EstimateValidationError[]
  history: EstimateAction[]
}

export const ESTIMATE_COLORS = {
  contractor: {
    background: '#eff6ff',
    border: '#bfdbfe',
    text: '#1e40af'
  },
  work: {
    background: '#f0fdf4',
    border: '#bbf7d0',
    text: '#15803d'
  },
  material: {
    background: '#fffbeb',
    border: '#fed7aa',
    text: '#ea580c'
  },
  edited: {
    background: '#fef3c7',
    border: '#fcd34d',
    text: '#92400e'
  },
  selected: {
    background: '#e0e7ff',
    border: '#c7d2fe',
    text: '#3730a3'
  }
} as const

export const DEFAULT_VAT_RATE = 20

export const UNITS = [
  'м³', 'м²', 'м', 'кг', 'т', 'шт', 'компл', 'л', 'км', 'час', 'смена'
] as const

export const JUSTIFICATION_TYPES = [
  'подрядчик', 'раб', 'мат'
] as const

export const MATERIAL_TYPES = [
  'основа', 'вспом'
] as const

// Новые типы для консоли расценок
export interface RatePosition extends Record<string, unknown> {
  id: string
  type: 'Заказчик' | 'раб' | 'мат'
  materialType?: 'Основной' | 'Вспом'
  name: string
  unit: string
  volume: number
  consumptionRate: number
  workPrice: number
  materialPrice: number
  deliveryPrice: number
  total: number
  groupId?: string
}

export interface RateGroup {
  id: string
  contractor: RatePosition
  works: RatePosition[]
  materials: RatePosition[]
  totalSum: number
  isExpanded?: boolean
}

export const RATE_COLORS = {
  contractor: {
    background: '#4472C4',
    text: '#FFFFFF'
  },
  work: {
    background: '#70AD47',
    text: '#FFFFFF'
  },
  materialMain: {
    background: '#FFC000',
    text: '#000000',
    border: '#CC9900'
  },
  materialAux: {
    background: '#FFE699',
    text: '#000000',
    border: '#B8860B'
  }
} as const

// Дополнительные типы для поддержки виджетов
export interface EstimateItem {
  id: string
  materials: string
  works: string
  quantity: number
  unit_id: string
  unit_price: number
  total_price: number
  notes?: string
  material_type?: string
  coefficient: number
  work_price: number
  material_price: number
  delivery_cost: number
  record_type: 'detail' | 'summary'
  project_id: string
  unit?: {
    name: string
    short_name: string
  }
  // Дополнительные свойства для иерархии и состояния
  children?: EstimateItem[]
  isExpanded?: boolean
}

export interface EstimateCalculations {
  totalMaterials: number
  totalWorks: number
  totalDelivery: number
  grandTotal: number
  itemsCount: number
  // Дополнительные поля для совместимости
  totalSum?: number
  totalMaterialCost?: number
  totalWorkCost?: number
  totalDeliveryCost?: number
}

export interface CSVParseResult {
  data: Record<string, unknown>[]
  errors: Array<{
    type: string
    code: string
    message: string
    row: number
  }>
  meta: {
    fields?: string[]
    delimiter: string
    linebreak: string
    aborted: boolean
    truncated: boolean
    cursor: number
  }
  // Дополнительные поля для совместимости
  totalRows?: number
  skippedRows?: number
}

// Дополнительные типы для EstimateProvider
export interface EstimateContextType {
  items: EstimateItem[]
  analytics: EstimateAnalytics
  filters: EstimateFilters
  modifications: EstimateModification[]
  selectedIds: string[]
  isLoading: boolean
  error: string | null

  // Методы
  setItems: (items: EstimateItem[]) => void
  setFilters: (filters: EstimateFilters) => void
  setSelectedIds: (ids: string[]) => void
  addItem: (item: Omit<EstimateItem, 'id'>) => void
  updateItem: (id: string, updates: Partial<EstimateItem>) => void
  deleteItem: (id: string) => void
  importItems: (items: EstimateItem[]) => void
  exportItems: (options: EstimateExportOptions) => void
}

export interface EstimateAnalytics {
  totalItems: number
  totalValue: number
  averageValue: number
  categories: Record<string, number>
  trends: Array<{
    date: string
    value: number
  }>
}

export interface EstimateFilters {
  search?: string
  category?: string
  dateRange?: {
    start: string
    end: string
  }
  valueRange?: {
    min: number
    max: number
  }
  justification?: 'подрядчик' | 'раб' | 'мат' | 'all'
  materialType?: 'основа' | 'вспом' | 'all'
}

export interface EstimateModification {
  id: string
  itemId: string
  type: 'create' | 'update' | 'delete'
  oldValue?: Partial<EstimateItem>
  newValue?: Partial<EstimateItem>
  timestamp: string
  userId?: string
}

