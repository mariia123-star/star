// Утилиты для автоматического подбора расценок из Excel
// Основано на алгоритме нечёткого поиска с приоритетом подкатегорий

export interface RateMatchWeights {
  subcategory: number
  name: number
  unit: number
  description: number
}

export interface RateMatchResult {
  rateId: string
  rateName: string
  rateCode: string
  score: number
  subcategorySimilarity: number
  nameSimilarity: number
  descriptionSimilarity: number
  unitMatch: boolean
  components: {
    subcategory: number
    name: number
    unit: number
    description: number
  }
}

export interface EstimateRow {
  id?: string
  workName: string
  unit: string
  volume: number
  subcategory?: string
  category?: string
  description?: string
}

export interface Rate {
  id: string
  code: string
  name: string
  description?: string
  unit_name: string
  base_price: number
  category?: string
  subcategory?: string
  is_active: boolean
}

// Конфигурация весов для расчёта score
const DEFAULT_WEIGHTS: RateMatchWeights = {
  subcategory: 0.4, // Подкатегория - самый важный параметр
  name: 0.35, // Наименование
  unit: 0.15, // Единица измерения
  description: 0.1, // Описание
}

/**
 * Вычисление расстояния Левенштейна для нечёткого поиска
 */
function levenshteinDistance(str1: string, str2: string): number {
  const len1 = str1.length
  const len2 = str2.length
  const matrix: number[][] = []

  for (let i = 0; i <= len1; i++) {
    matrix[i] = [i]
  }

  for (let j = 0; j <= len2; j++) {
    matrix[0][j] = j
  }

  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      const cost = str1[i - 1] === str2[j - 1] ? 0 : 1
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      )
    }
  }

  return matrix[len1][len2]
}

/**
 * Вычисление схожести двух строк (0 - разные, 1 - идентичные)
 */
export function stringSimilarity(str1: string, str2: string): number {
  if (!str1 || !str2) return 0

  const s1 = str1.toLowerCase().trim()
  const s2 = str2.toLowerCase().trim()

  if (s1 === s2) return 1.0

  const maxLen = Math.max(s1.length, s2.length)
  if (maxLen === 0) return 1.0

  const distance = levenshteinDistance(s1, s2)
  return 1 - distance / maxLen
}

/**
 * Нормализация строки для сравнения
 */
export function normalizeString(str: string | undefined | null): string {
  if (!str) return ''
  return str
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/[.,;:()]/g, '')
}

/**
 * Поиск подходящих расценок для позиции сметы с приоритетом подкатегории
 */
export function findMatchingRates(
  estimateItem: EstimateRow,
  ratesCollection: Rate[],
  threshold = 0.6,
  weights: RateMatchWeights = DEFAULT_WEIGHTS
): RateMatchResult[] {
  const matches: RateMatchResult[] = []

  // Нормализуем данные позиции сметы
  const normalizedEstimateName = normalizeString(estimateItem.workName)
  const normalizedEstimateSubcategory = normalizeString(estimateItem.subcategory)
  const normalizedEstimateUnit = normalizeString(estimateItem.unit)

  for (const rate of ratesCollection) {
    // Пропускаем неактивные расценки
    if (!rate.is_active) continue

    // Нормализуем данные расценки
    const normalizedRateName = normalizeString(rate.name)
    const normalizedRateSubcategory = normalizeString(rate.subcategory)
    const normalizedRateUnit = normalizeString(rate.unit_name)
    const normalizedRateDescription = normalizeString(rate.description)

    // 1. Совпадение по подкатегории (самое важное)
    let subcategorySimilarity = 0
    if (normalizedEstimateSubcategory && normalizedRateSubcategory) {
      subcategorySimilarity = stringSimilarity(
        normalizedEstimateSubcategory,
        normalizedRateSubcategory
      )
    }

    // 2. Совпадение по наименованию
    const nameSimilarity = stringSimilarity(
      normalizedEstimateName,
      normalizedRateName
    )

    // 3. Совпадение по описанию (дополнительно)
    let descriptionSimilarity = 0
    if (normalizedRateDescription) {
      descriptionSimilarity = stringSimilarity(
        normalizedEstimateName,
        normalizedRateDescription
      )
    }

    // 4. Совпадение по единице измерения
    const unitMatch = normalizedEstimateUnit === normalizedRateUnit

    // Вычисляем взвешенный score
    const score =
      subcategorySimilarity * weights.subcategory +
      nameSimilarity * weights.name +
      (unitMatch ? 1 : 0) * weights.unit +
      descriptionSimilarity * weights.description

    // Дополнительный бонус если подкатегория совпадает точно
    let finalScore = score
    if (subcategorySimilarity >= 0.95) {
      finalScore = Math.min(1.0, score + 0.1)
    }

    if (finalScore >= threshold) {
      matches.push({
        rateId: rate.id,
        rateName: rate.name,
        rateCode: rate.code,
        score: finalScore,
        subcategorySimilarity,
        nameSimilarity,
        descriptionSimilarity,
        unitMatch,
        components: {
          subcategory: subcategorySimilarity,
          name: nameSimilarity,
          unit: unitMatch ? 1 : 0,
          description: descriptionSimilarity,
        },
      })
    }
  }

  // Сортировка: сначала по score, потом по совпадению подкатегории
  matches.sort((a, b) => {
    if (Math.abs(b.score - a.score) > 0.05) {
      return b.score - a.score
    }
    return b.subcategorySimilarity - a.subcategorySimilarity
  })

  return matches
}

/**
 * Определение качества совпадения
 */
export function getMatchQuality(
  match: RateMatchResult
): 'exact' | 'good' | 'fair' | 'poor' {
  if (
    match.score >= 0.9 &&
    match.subcategorySimilarity >= 0.95 &&
    match.unitMatch
  ) {
    return 'exact'
  }
  if (match.score >= 0.75) {
    return 'good'
  }
  if (match.score >= 0.6) {
    return 'fair'
  }
  return 'poor'
}

/**
 * Форматирование информации о совпадении для отображения
 */
export function formatMatchInfo(match: RateMatchResult): string {
  const parts: string[] = []

  if (match.subcategorySimilarity > 0) {
    parts.push(
      `Подкат: ${(match.subcategorySimilarity * 100).toFixed(0)}%`
    )
  }
  parts.push(`Назв: ${(match.nameSimilarity * 100).toFixed(0)}%`)
  if (match.unitMatch) {
    parts.push('Ед.изм: ✓')
  }

  return parts.join(', ')
}
