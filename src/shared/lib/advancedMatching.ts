/**
 * Продвинутая система сопоставления материалов и расценок
 * Использует алгоритмы нечеткого поиска с кэшированием и оптимизацией
 */

import * as fuzz from 'fuzzball'

// ============================================================================
// ТИПЫ И ИНТЕРФЕЙСЫ
// ============================================================================

export type MatchingMode = 'legacy' | 'optimized' | 'equipment_code_priority'

export interface MatchingCriteria {
  name?: string
  description?: string
  category?: string
  article?: string
  specification?: string
  brand?: string
  equipment_code?: string
  manufacturer?: string
  characteristics?: Record<string, string | number>
}

export interface MatchingWeights {
  name: number
  description: number
  category: number
  article: number
  specification: number
  brand: number
  equipment_code: number
  manufacturer: number
  characteristics: number
}

export interface MatchResult<T = any> {
  item: T
  score: number
  matchDetails: {
    nameScore: number
    articleScore: number
    categoryScore: number
    characteristicsScore: number
    brandScore: number
    overallScore: number
  }
}

export interface MatchingOptions {
  mode: MatchingMode
  maxResults?: number
  minScore?: number
  categoryFilter?: string
  subcategoryFilter?: string
  enableCache?: boolean
}

// ============================================================================
// КОНСТАНТЫ И КОНФИГУРАЦИЯ
// ============================================================================

// Веса критериев для разных режимов
const MATCHING_WEIGHTS: Record<MatchingMode, MatchingWeights> = {
  legacy: {
    name: 40,
    description: 20,
    category: 15,
    article: 15,
    specification: 10,
    brand: 0,
    equipment_code: 0,
    manufacturer: 0,
    characteristics: 0,
  },
  optimized: {
    name: 50,
    description: 0,
    category: 0,
    article: 30,
    specification: 0,
    brand: 20,
    equipment_code: 0,
    manufacturer: 0,
    characteristics: 0,
  },
  equipment_code_priority: {
    name: 20,
    description: 0,
    category: 0,
    article: 0,
    specification: 0,
    brand: 0,
    equipment_code: 60,
    manufacturer: 20,
    characteristics: 0,
  },
}

// Словари синонимов для унификации терминов
const SYNONYM_DICTIONARIES: Record<string, string[]> = {
  кабель: ['кабель', 'провод', 'шнур', 'cable'],
  выключатель: ['выключатель', 'переключатель', 'switch', 'выкл'],
  розетка: ['розетка', 'socket', 'outlet', 'разъем'],
  светильник: ['светильник', 'лампа', 'lamp', 'light', 'освещение'],
  щит: ['щит', 'щиток', 'шкаф', 'panel', 'бокс'],
  труба: ['труба', 'трубка', 'pipe', 'tube'],
  'автоматический выключатель': [
    'автомат',
    'автоматический выключатель',
    'выключатель автоматический',
    'circuit breaker',
  ],
  контактор: ['контактор', 'contactor', 'пускатель'],
  реле: ['реле', 'relay'],
  датчик: ['датчик', 'sensor', 'сенсор'],
}

// Паттерны для извлечения характеристик
const CHARACTERISTIC_PATTERNS = {
  voltage: /(\d+)\s*[вВvV]/gi, // 220В, 380V
  current: /(\d+(?:\.\d+)?)\s*[аАaA]/gi, // 16А, 25A
  power: /(\d+(?:\.\d+)?)\s*[квткВтwWкК]/gi, // 2.5кВт, 500W
  size: /(\d+(?:\.\d+)?)\s*[xх×]\s*(\d+(?:\.\d+)?)/gi, // 3x2.5
  code: /[A-Z][A-Z0-9-]+/gi, // RS-485, C16, GTH-RM
  resolution: /(\d+)[pPрР]/gi, // 1080P, 720p
}

// ============================================================================
// КЭШИРОВАНИЕ
// ============================================================================

class NormalizationCache {
  private cache: Map<string, string> = new Map()
  private maxSize: number = 10000

  get(key: string): string | undefined {
    return this.cache.get(key)
  }

  set(key: string, value: string): void {
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value
      this.cache.delete(firstKey)
    }
    this.cache.set(key, value)
  }

  clear(): void {
    this.cache.clear()
  }
}

const normalizationCache = new NormalizationCache()

// ============================================================================
// НОРМАЛИЗАЦИЯ ТЕКСТА
// ============================================================================

/**
 * Нормализует текст для сравнения
 */
export function normalizeText(text: string | undefined | null): string {
  if (!text) return ''

  const cached = normalizationCache.get(text)
  if (cached !== undefined) return cached

  let normalized = text
    .toLowerCase()
    .trim()
    // Удаляем спецсимволы, кроме букв, цифр, пробелов и дефисов
    .replace(/[^\wа-яё\s-]/gi, ' ')
    // Удаляем лишние пробелы
    .replace(/\s+/g, ' ')
    .trim()

  // Заменяем синонимы
  for (const [canonical, synonyms] of Object.entries(SYNONYM_DICTIONARIES)) {
    for (const synonym of synonyms) {
      const regex = new RegExp(`\\b${synonym}\\b`, 'gi')
      normalized = normalized.replace(regex, canonical)
    }
  }

  normalizationCache.set(text, normalized)
  return normalized
}

/**
 * Извлекает числовые характеристики из текста
 */
export function extractCharacteristics(
  text: string
): Record<string, string[]> {
  const characteristics: Record<string, string[]> = {}

  for (const [key, pattern] of Object.entries(CHARACTERISTIC_PATTERNS)) {
    const matches = text.matchAll(pattern)
    const values: string[] = []

    for (const match of matches) {
      values.push(match[0])
    }

    if (values.length > 0) {
      characteristics[key] = values
    }
  }

  return characteristics
}

/**
 * Сравнивает характеристики двух объектов
 */
function compareCharacteristics(
  chars1: Record<string, string[]>,
  chars2: Record<string, string[]>
): number {
  const keys1 = Object.keys(chars1)
  const keys2 = Object.keys(chars2)

  if (keys1.length === 0 || keys2.length === 0) return 0

  let matchCount = 0
  let totalCount = 0

  for (const key of keys1) {
    if (chars2[key]) {
      totalCount++
      const values1 = chars1[key]
      const values2 = chars2[key]

      // Проверяем пересечение значений
      const hasMatch = values1.some(v1 =>
        values2.some(v2 => v1.toLowerCase() === v2.toLowerCase())
      )

      if (hasMatch) matchCount++
    }
  }

  return totalCount > 0 ? (matchCount / totalCount) * 100 : 0
}

// ============================================================================
// АЛГОРИТМЫ СОПОСТАВЛЕНИЯ
// ============================================================================

/**
 * Вычисляет скор совпадения текстов с использованием fuzzball
 */
function calculateTextScore(
  text1: string | undefined | null,
  text2: string | undefined | null
): number {
  if (!text1 || !text2) return 0

  const norm1 = normalizeText(text1)
  const norm2 = normalizeText(text2)

  if (!norm1 || !norm2) return 0

  // Быстрый путь для идентичных текстов
  if (norm1 === norm2) return 100

  // Используем комбинацию алгоритмов
  const ratioScore = fuzz.ratio(norm1, norm2)
  const tokenSortScore = fuzz.token_sort_ratio(norm1, norm2)
  const tokenSetScore = fuzz.token_set_ratio(norm1, norm2)

  // Взвешенное среднее
  return (ratioScore * 0.3 + tokenSortScore * 0.4 + tokenSetScore * 0.3)
}

/**
 * Вычисляет общий скор совпадения с учетом весов
 */
function calculateOverallScore(
  criteria: MatchingCriteria,
  candidate: MatchingCriteria,
  weights: MatchingWeights
): MatchResult['matchDetails'] {
  const nameScore = calculateTextScore(criteria.name, candidate.name)
  const descriptionScore = calculateTextScore(
    criteria.description,
    candidate.description
  )
  const categoryScore = calculateTextScore(criteria.category, candidate.category)
  const articleScore = calculateTextScore(criteria.article, candidate.article)
  const specificationScore = calculateTextScore(
    criteria.specification,
    candidate.specification
  )
  const brandScore = calculateTextScore(criteria.brand, candidate.brand)
  const equipmentCodeScore = calculateTextScore(
    criteria.equipment_code,
    candidate.equipment_code
  )
  const manufacturerScore = calculateTextScore(
    criteria.manufacturer,
    candidate.manufacturer
  )

  // Сравниваем характеристики
  const criteriaChars = extractCharacteristics(
    `${criteria.name} ${criteria.description}`.trim()
  )
  const candidateChars = extractCharacteristics(
    `${candidate.name} ${candidate.description}`.trim()
  )
  const characteristicsScore = compareCharacteristics(
    criteriaChars,
    candidateChars
  )

  // Вычисляем взвешенный общий скор
  let totalScore = 0
  let totalWeight = 0

  if (weights.name > 0) {
    totalScore += nameScore * weights.name
    totalWeight += weights.name
  }
  if (weights.description > 0) {
    totalScore += descriptionScore * weights.description
    totalWeight += weights.description
  }
  if (weights.category > 0) {
    totalScore += categoryScore * weights.category
    totalWeight += weights.category
  }
  if (weights.article > 0) {
    totalScore += articleScore * weights.article
    totalWeight += weights.article
  }
  if (weights.specification > 0) {
    totalScore += specificationScore * weights.specification
    totalWeight += weights.specification
  }
  if (weights.brand > 0) {
    totalScore += brandScore * weights.brand
    totalWeight += weights.brand
  }
  if (weights.equipment_code > 0) {
    totalScore += equipmentCodeScore * weights.equipment_code
    totalWeight += weights.equipment_code
  }
  if (weights.manufacturer > 0) {
    totalScore += manufacturerScore * weights.manufacturer
    totalWeight += weights.manufacturer
  }
  if (weights.characteristics > 0) {
    totalScore += characteristicsScore * weights.characteristics
    totalWeight += weights.characteristics
  }

  const overallScore = totalWeight > 0 ? totalScore / totalWeight : 0

  return {
    nameScore,
    articleScore,
    categoryScore,
    characteristicsScore,
    brandScore,
    overallScore,
  }
}

// ============================================================================
// ОСНОВНОЙ API
// ============================================================================

/**
 * Находит лучшие совпадения из списка кандидатов
 */
export function findBestMatches<T extends MatchingCriteria>(
  criteria: MatchingCriteria,
  candidates: T[],
  options: MatchingOptions
): MatchResult<T>[] {
  console.log('Advanced Matching:', {
    mode: options.mode,
    criteriaName: criteria.name,
    candidatesCount: candidates.length,
    timestamp: new Date().toISOString(),
  })

  const weights = MATCHING_WEIGHTS[options.mode]
  const results: MatchResult<T>[] = []

  // Фильтрация по категории
  let filteredCandidates = candidates
  if (options.categoryFilter) {
    filteredCandidates = filteredCandidates.filter(
      c =>
        normalizeText(c.category) === normalizeText(options.categoryFilter!)
    )
  }
  if (options.subcategoryFilter) {
    filteredCandidates = filteredCandidates.filter(
      c =>
        normalizeText((c as any).subcategory) ===
        normalizeText(options.subcategoryFilter!)
    )
  }

  // Вычисляем скоры для всех кандидатов
  for (const candidate of filteredCandidates) {
    const matchDetails = calculateOverallScore(criteria, candidate, weights)

    if (
      !options.minScore ||
      matchDetails.overallScore >= options.minScore
    ) {
      results.push({
        item: candidate,
        score: matchDetails.overallScore,
        matchDetails,
      })
    }
  }

  // Сортируем по убыванию скора
  results.sort((a, b) => b.score - a.score)

  // Ограничиваем количество результатов
  const maxResults = options.maxResults || 10
  const topResults = results.slice(0, maxResults)

  console.log('Matching Results:', {
    mode: options.mode,
    totalCandidates: candidates.length,
    filteredCandidates: filteredCandidates.length,
    matchesFound: results.length,
    topMatches: topResults.length,
    bestScore: topResults[0]?.score || 0,
    timestamp: new Date().toISOString(),
  })

  return topResults
}

/**
 * Ручной поиск с расширенными фильтрами
 */
export function manualSearch<T extends MatchingCriteria>(
  searchQuery: string,
  candidates: T[],
  options: {
    categoryFilter?: string
    subcategoryFilter?: string
    brandFilter?: string
    maxResults?: number
    minScore?: number
  } = {}
): MatchResult<T>[] {
  console.log('Manual Search:', {
    query: searchQuery,
    candidatesCount: candidates.length,
    filters: options,
    timestamp: new Date().toISOString(),
  })

  // Веса для ручного поиска
  const manualWeights: MatchingWeights = {
    name: 35,
    description: 0,
    category: 0,
    article: 40,
    specification: 0,
    brand: 25,
    equipment_code: 0,
    manufacturer: 0,
    characteristics: 0,
  }

  const criteria: MatchingCriteria = {
    name: searchQuery,
    article: searchQuery,
    brand: options.brandFilter,
  }

  const results: MatchResult<T>[] = []

  // Фильтрация кандидатов
  let filteredCandidates = candidates

  if (options.categoryFilter) {
    filteredCandidates = filteredCandidates.filter(
      c =>
        normalizeText(c.category) === normalizeText(options.categoryFilter!)
    )
  }

  if (options.subcategoryFilter) {
    filteredCandidates = filteredCandidates.filter(
      c =>
        normalizeText((c as any).subcategory) ===
        normalizeText(options.subcategoryFilter!)
    )
  }

  if (options.brandFilter) {
    filteredCandidates = filteredCandidates.filter(
      c => normalizeText(c.brand) === normalizeText(options.brandFilter!)
    )
  }

  // Вычисляем скоры
  for (const candidate of filteredCandidates) {
    const matchDetails = calculateOverallScore(criteria, candidate, manualWeights)

    if (
      !options.minScore ||
      matchDetails.overallScore >= options.minScore
    ) {
      results.push({
        item: candidate,
        score: matchDetails.overallScore,
        matchDetails,
      })
    }
  }

  // Сортируем и ограничиваем
  results.sort((a, b) => b.score - a.score)
  const maxResults = options.maxResults || 10
  const topResults = results.slice(0, maxResults)

  console.log('Manual Search Results:', {
    query: searchQuery,
    totalCandidates: candidates.length,
    filteredCandidates: filteredCandidates.length,
    matchesFound: results.length,
    topMatches: topResults.length,
    bestScore: topResults[0]?.score || 0,
    timestamp: new Date().toISOString(),
  })

  return topResults
}

/**
 * Очищает кэш нормализации
 */
export function clearCache(): void {
  normalizationCache.clear()
  console.log('Normalization cache cleared')
}
