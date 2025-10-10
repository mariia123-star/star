/**
 * Система коэффициентов для расчета сметы
 * Используется для применения накруток и наценок на работы, материалы и субподряд
 */

export interface EstimateCoefficients {
  sm: number // P6 - Работы СМ (строительный монтаж)
  mbp: number // Q6 - Материалы МБП (малоценные быстроизнашивающиеся предметы)
  warranty: number // T6 - Гарантийный период
  work16: number // U6 - Работы 1,6
  workGrowth: number // V6 - Работы рост
  matGrowth: number // W6 - Материалы рост
  unforeseen: number // X6 - Непредвиденные расходы
  subOOZ: number // Y6 - Субподряд ООЗ (общие эксплуатационные затраты)
  workMatOOZ: number // Z6 - Раб+Мат ООЗ
  workMatOFZ: number // AA6 - Раб+Мат ОФЗ (общие фонды заработной платы)
  workMatProfit: number // AB6 - Раб+Мат прибыль
  subProfit: number // AC6 - Субподряд прибыль
}

/**
 * Коэффициенты по умолчанию для системы "Кладка/Витраж"
 */
export const DEFAULT_COEFFICIENTS: EstimateCoefficients = {
  sm: 0.06, // 6%
  mbp: 0.08, // 8%
  warranty: 0.05, // 5%
  work16: 0.6, // 60%
  workGrowth: 0.1, // 10%
  matGrowth: 0.1, // 10%
  unforeseen: 0.03, // 3%
  subOOZ: 0.1, // 10%
  workMatOOZ: 0.1, // 10%
  workMatOFZ: 0.2, // 20%
  workMatProfit: 0.1, // 10%
  subProfit: 0.16, // 16%
}

/**
 * Описания коэффициентов для UI
 */
export const COEFFICIENT_LABELS: Record<keyof EstimateCoefficients, string> = {
  sm: 'СМ (0.06)',
  mbp: 'МБП (0.08)',
  warranty: 'Гарантия (0.05)',
  work16: 'Работы 1.6 (0.6)',
  workGrowth: 'Работы рост (0.1)',
  matGrowth: 'Мат рост (0.1)',
  unforeseen: 'Непредв. (0.03)',
  subOOZ: 'Суб ООЗ (0.1)',
  workMatOOZ: 'Р+М ООЗ (0.1)',
  workMatOFZ: 'Р+М ОФЗ (0.2)',
  workMatProfit: 'Р+М приб (0.1)',
  subProfit: 'Суб приб (0.16)',
}

/**
 * Сохранить коэффициенты в localStorage
 */
export const saveCoefficients = (coefficients: EstimateCoefficients): void => {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(
        'estimateCoefficients',
        JSON.stringify(coefficients)
      )
      console.log('💾 Коэффициенты сохранены:', coefficients)
    }
  } catch (error) {
    console.error('❌ Ошибка сохранения коэффициентов:', error)
  }
}

/**
 * Загрузить коэффициенты из localStorage
 */
export const loadCoefficients = (): EstimateCoefficients => {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const stored = window.localStorage.getItem('estimateCoefficients')
      if (stored) {
        const parsed = JSON.parse(stored) as EstimateCoefficients
        console.log('📥 Коэффициенты загружены из localStorage:', parsed)
        return parsed
      }
    }
  } catch (error) {
    console.error('❌ Ошибка загрузки коэффициентов:', error)
  }
  return DEFAULT_COEFFICIENTS
}

/**
 * Сбросить коэффициенты к значениям по умолчанию
 */
export const resetCoefficients = (): EstimateCoefficients => {
  saveCoefficients(DEFAULT_COEFFICIENTS)
  return DEFAULT_COEFFICIENTS
}
