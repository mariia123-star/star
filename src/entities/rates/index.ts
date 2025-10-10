export type { Rate, RateCreate, RateUpdate, RateWithUnit } from './types'
export { ratesApi } from './api/rates-api'

// Экспорт API для материалов в расценках
export type {
  RateMaterial,
  RateMaterialCreate,
  RateMaterialUpdate,
} from './api/rate-materials-api'
export { rateMaterialsApi } from './api/rate-materials-api'
