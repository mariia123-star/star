/**
 * Модуль для сопоставления позиций сметы с расценками
 *
 * Логика сопоставления:
 * - Категория и подкатегория: только 100% совпадение
 * - Наименование: 50-100% совпадений (нечеткий поиск)
 */

export interface EstimateRow {
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

export interface RateMatchResult {
  rateId: string
  rateName: string
  rateCode: string
  score: number
  matchType: 'exact_name' | 'high_similarity' | 'medium_similarity' | 'low_similarity'
  categoryMatch: boolean
  subcategoryMatch: boolean
  unitMatch: boolean
}

/**
 * Нормализует текст для сравнения
 */
function normalizeText(text: string | undefined | null): string {
  if (!text) return ''
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\wа-яё\s]/gi, ' ')
    .replace(/\s+/g, ' ')
}

/**
 * Вычисляет схожесть двух строк (алгоритм Левенштейна упрощенный)
 */
function calculateSimilarity(str1: string, str2: string): number {
  const s1 = normalizeText(str1)
  const s2 = normalizeText(str2)

  if (s1 === s2) return 1.0

  // Проверка вхождения одной строки в другую
  if (s1.includes(s2) || s2.includes(s1)) {
    const longer = Math.max(s1.length, s2.length)
    const shorter = Math.min(s1.length, s2.length)
    return shorter / longer
  }

  // Алгоритм Левенштейна (расстояние редактирования)
  const matrix: number[][] = []

  for (let i = 0; i <= s2.length; i++) {
    matrix[i] = [i]
  }

  for (let j = 0; j <= s1.length; j++) {
    matrix[0][j] = j
  }

  for (let i = 1; i <= s2.length; i++) {
    for (let j = 1; j <= s1.length; j++) {
      if (s2.charAt(i - 1) === s1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1]
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // замена
          matrix[i][j - 1] + 1, // вставка
          matrix[i - 1][j] + 1 // удаление
        )
      }
    }
  }

  const distance = matrix[s2.length][s1.length]
  const maxLength = Math.max(s1.length, s2.length)
  return 1 - distance / maxLength
}

/**
 * Проверяет точное совпадение категории (100%)
 */
function isCategoryExactMatch(
  estimateCategory: string | undefined,
  rateCategory: string | undefined
): boolean {
  if (!estimateCategory || !rateCategory) return false
  return normalizeText(estimateCategory) === normalizeText(rateCategory)
}

/**
 * Проверяет точное совпадение подкатегории (100%)
 */
function isSubcategoryExactMatch(
  estimateSubcategory: string | undefined,
  rateSubcategory: string | undefined
): boolean {
  if (!estimateSubcategory || !rateSubcategory) return false
  return (
    normalizeText(estimateSubcategory) === normalizeText(rateSubcategory)
  )
}

/**
 * Проверяет совпадение единиц измерения
 */
function isUnitMatch(estimateUnit: string, rateUnit: string): boolean {
  const normalized1 = normalizeText(estimateUnit)
  const normalized2 = normalizeText(rateUnit)

  // Точное совпадение
  if (normalized1 === normalized2) return true

  // Общие синонимы единиц измерения
  const unitSynonyms: Record<string, string[]> = {
    шт: ['шт', 'штук', 'штука', 'ед', 'единица'],
    м: ['м', 'метр', 'метров', 'погм', 'погонный метр'],
    м2: ['м2', 'кв м', 'квадратный метр', 'м кв'],
    м3: ['м3', 'куб м', 'кубический метр', 'м куб'],
    кг: ['кг', 'килограмм', 'кг'],
    т: ['т', 'тонна', 'тонн'],
    л: ['л', 'литр', 'литров'],
  }

  for (const [canonical, synonyms] of Object.entries(unitSynonyms)) {
    if (synonyms.includes(normalized1) && synonyms.includes(normalized2)) {
      return true
    }
  }

  return false
}

/**
 * Определяет тип совпадения по наименованию
 */
function getMatchType(score: number): RateMatchResult['matchType'] {
  if (score >= 0.95) return 'exact_name'
  if (score >= 0.75) return 'high_similarity'
  if (score >= 0.6) return 'medium_similarity'
  return 'low_similarity'
}

/**
 * Находит подходящие расценки для позиции сметы
 *
 * ПРАВИЛА:
 * 1. Категория и подкатегория - ОБЯЗАТЕЛЬНО 100% совпадение
 * 2. Наименование - 50-100% совпадений (нечеткий поиск)
 * 3. Единица измерения - желательно совпадение (не блокирующее)
 */
export function findMatchingRates(
  estimate: EstimateRow,
  rates: Rate[],
  minNameSimilarity: number = 0.5 // Минимум 50% для наименования
): RateMatchResult[] {
  console.log('🔍 Finding matching rates', {
    action: 'find_matching_rates',
    estimateName: estimate.workName,
    estimateSubcategory: estimate.subcategory,
    estimateCategory: estimate.category,
    estimateUnit: estimate.unit,
    ratesCount: rates.length,
    minNameSimilarity,
    timestamp: new Date().toISOString(),
  })

  // ВАЖНО: Если нет подкатегории - это ошибка
  if (!estimate.subcategory || !estimate.subcategory.trim()) {
    console.warn('⚠️ Subcategory is required but missing', {
      estimateName: estimate.workName,
    })
    return []
  }

  const matches: RateMatchResult[] = []

  for (const rate of rates) {
    // ПРАВИЛО 1: Подкатегория - строго 100% совпадение
    const subcategoryMatch = isSubcategoryExactMatch(
      estimate.subcategory,
      rate.subcategory
    )

    if (!subcategoryMatch) {
      // Пропускаем расценку если подкатегория не совпадает
      continue
    }

    // ПРАВИЛО 2: Категория - строго 100% совпадение (если указана)
    let categoryMatch = true
    if (estimate.category && rate.category) {
      categoryMatch = isCategoryExactMatch(estimate.category, rate.category)
      if (!categoryMatch) {
        // Пропускаем расценку если категория не совпадает
        continue
      }
    }

    // ПРАВИЛО 3: Наименование - нечеткое совпадение 50-100%
    const nameSimilarity = calculateSimilarity(estimate.workName, rate.name)

    if (nameSimilarity < minNameSimilarity) {
      // Пропускаем если схожесть наименования ниже порога
      continue
    }

    // Проверка единицы измерения (не блокирующая)
    const unitMatch = isUnitMatch(estimate.unit, rate.unit_name)

    // Вычисляем финальный score
    // Подкатегория и категория уже 100%, поэтому учитываем только наименование и единицы
    let finalScore = nameSimilarity

    // Бонус за совпадение единиц измерения (+5%)
    if (unitMatch) {
      finalScore = Math.min(1.0, finalScore + 0.05)
    }

    const matchType = getMatchType(nameSimilarity)

    matches.push({
      rateId: rate.id,
      rateName: rate.name,
      rateCode: rate.code,
      score: finalScore,
      matchType,
      categoryMatch,
      subcategoryMatch,
      unitMatch,
    })
  }

  // Сортируем по убыванию score
  matches.sort((a, b) => b.score - a.score)

  console.log('✅ Matching completed', {
    action: 'matching_completed',
    estimateName: estimate.workName,
    matchesFound: matches.length,
    topScore: matches[0]?.score || 0,
    topMatch: matches[0]?.rateName || 'none',
    timestamp: new Date().toISOString(),
  })

  return matches
}

/**
 * Определяет качество совпадения
 */
export function getMatchQuality(
  match: RateMatchResult
): 'exact' | 'good' | 'acceptable' | 'poor' {
  if (match.score >= 0.95 && match.unitMatch) return 'exact'
  if (match.score >= 0.75) return 'good'
  if (match.score >= 0.6) return 'acceptable'
  return 'poor'
}

/**
 * Форматирует информацию о совпадении для отображения
 */
export function formatMatchInfo(match: RateMatchResult): string {
  const parts: string[] = []

  // Информация о категории
  if (match.categoryMatch) {
    parts.push('✓ Категория')
  }

  // Информация о подкатегории
  if (match.subcategoryMatch) {
    parts.push('✓ Подкатегория')
  }

  // Информация о наименовании
  const namePercent = (match.score * 100).toFixed(0)
  parts.push(`Наименование: ${namePercent}%`)

  // Информация о единицах
  if (match.unitMatch) {
    parts.push('✓ Ед.изм.')
  } else {
    parts.push('⚠ Разные ед.изм.')
  }

  return parts.join(' • ')
}

/**
 * Проверяет валидность строки Excel
 */
export function validateEstimateRow(row: EstimateRow): {
  isValid: boolean
  errors: string[]
} {
  const errors: string[] = []

  if (!row.workName || !row.workName.trim()) {
    errors.push('Отсутствует наименование работ')
  }

  if (!row.unit || !row.unit.trim()) {
    errors.push('Отсутствует единица измерения')
  }

  if (!row.volume || row.volume <= 0) {
    errors.push('Некорректный объём')
  }

  // ОБЯЗАТЕЛЬНОЕ ПОЛЕ
  if (!row.subcategory || !row.subcategory.trim()) {
    errors.push('ОБЯЗАТЕЛЬНО: Отсутствует подкатегория (столбец 4)')
  }

  return {
    isValid: errors.length === 0,
    errors,
  }
}
