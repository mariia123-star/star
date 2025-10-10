/**
 * Система вычислений для сметных расчетов
 * Реализует алгоритм расчета стоимости с применением коэффициентов и наценок
 */

import type { EstimateCoefficients } from './estimateCoefficients'

/**
 * Типы строк в смете
 */
export type RowType =
  | 'Заказчик'
  | 'раб'
  | 'мат'
  | 'суб-раб'
  | 'суб-мат'
  | 'Разделитель'

/**
 * Типы материалов
 */
export type MaterialType = '' | 'основ' | 'вспом'

/**
 * Интерфейс строки сметы для вычислений
 */
export interface EstimateRow {
  id: string
  materialType: MaterialType
  rowType: RowType
  workName: string
  unit: string
  volume: number
  materialCoef: number
  workVolume: number
  workPrice: number
  matPriceNoDelivery: number
  delivery: number
  matPriceWithDelivery: number
  isCollapsed?: boolean // Для строк "Заказчик" - свернута ли группа
}

/**
 * Результаты расчета строки сметы
 */
export interface RowCalculationResult {
  // Основная стоимость (колонка M)
  total: number

  // Промежуточные расчеты (колонки O-AC)
  workPZ: number // O - Работы ПЗ (прямые затраты)
  workSM: number // P - Работы СМ (строительный монтаж)
  matMBP: number // Q - Материалы МБП
  matPZ: number // R - Материалы ПЗ
  subPZ: number // S - Субподряд ПЗ
  warranty: number // T - Гарантийный период
  work16: number // U - Работы 1,6
  workGrowth: number // V - Работы рост
  matGrowth: number // W - Материалы рост
  unforeseen: number // X - Непредвиденные
  subOOZ: number // Y - Субподряд ООЗ
  workMatOOZ: number // Z - Раб+Мат ООЗ
  workMatOFZ: number // AA - Раб+Мат ОФЗ
  workMatProfit: number // AB - Раб+Мат прибыль
  subProfit: number // AC - Субподряд прибыль

  // Итоговые колонки (AF, AG)
  materialsInKP: number // AF - Материалы в коммерческом предложении
  worksInKP: number // AG - Работы в коммерческом предложении
}

/**
 * Вычисление стоимости строки сметы с применением всех коэффициентов
 *
 * @param row - Строка сметы с исходными данными
 * @param coefficients - Коэффициенты для расчета накруток
 * @returns Результаты всех промежуточных и итоговых расчетов
 */
export const calculateRow = (
  row: EstimateRow,
  coefficients: EstimateCoefficients
): RowCalculationResult => {
  const volume = parseFloat(String(row.volume)) || 0
  const workVolume = parseFloat(String(row.workVolume)) || 0
  const workPrice = parseFloat(String(row.workPrice)) || 0
  const matPriceWithDelivery = parseFloat(String(row.matPriceWithDelivery)) || 0

  // M = H * I (для работ) или H * L (для материалов)
  let total = 0
  if (row.rowType === 'раб' || row.rowType === 'суб-раб') {
    total = workVolume * workPrice
  } else if (row.rowType === 'мат' || row.rowType === 'суб-мат') {
    total = workVolume * matPriceWithDelivery
  }

  // O - Работы ПЗ (прямые затраты на работы)
  const workPZ = row.rowType === 'раб' ? total : 0

  // P - Работы СМ (строительный монтаж) = O * коэф_СМ
  const workSM = workPZ ? workPZ * coefficients.sm : 0

  // Q - Материалы МБП (малоценные быстроизнашивающиеся предметы) = O * коэф_МБП
  const matMBP = workPZ ? workPZ * coefficients.mbp : 0

  // R - Материалы ПЗ (прямые затраты на материалы)
  const matPZ = row.rowType === 'мат' ? total : 0

  // S - Субподряд ПЗ (прямые затраты на субподряд)
  const subPZ =
    row.rowType === 'суб-мат' ? total : row.rowType === 'суб-раб' ? total : 0

  // T - Гарантийный период = O * коэф_гарантия
  const warranty = workPZ * coefficients.warranty

  // U - Работы 1,6 = (O + P) * (1 + коэф_работы_1.6)
  const work16 = workPZ ? (workPZ + workSM) * (1 + coefficients.work16) : 0

  // V - Работы рост = (U + Q) * (1 + коэф_работы_рост)
  const workGrowth = work16
    ? (work16 + matMBP) * (1 + coefficients.workGrowth)
    : 0

  // W - Материалы рост = R * (1 + коэф_материалы_рост)
  const matGrowth = matPZ ? matPZ * (1 + coefficients.matGrowth) : 0

  // X - Непредвиденные = (U + Q + R) * (1 + коэф_непредвиденные)
  const unforeseen =
    work16 + matMBP + matPZ
      ? (work16 + matMBP + matPZ) * (1 + coefficients.unforeseen)
      : 0

  // Y - Субподряд ООЗ = S * (1 + коэф_суб_ООЗ)
  const subOOZ = subPZ ? subPZ * (1 + coefficients.subOOZ) : 0

  // Z - Раб+Мат ООЗ = (V + W + X - U - R - Q) * (1 + коэф_раб_мат_ООЗ)
  const workMatOOZ =
    workGrowth + matGrowth + unforeseen - work16 - matPZ - matMBP
      ? (workGrowth + matGrowth + unforeseen - work16 - matPZ - matMBP) *
        (1 + coefficients.workMatOOZ)
      : 0

  // AA - Раб+Мат ОФЗ = Z * (1 + коэф_раб_мат_ОФЗ)
  const workMatOFZ = workMatOOZ ? workMatOOZ * (1 + coefficients.workMatOFZ) : 0

  // AB - Раб+Мат прибыль = AA * (1 + коэф_раб_мат_прибыль)
  const workMatProfit = workMatOFZ
    ? workMatOFZ * (1 + coefficients.workMatProfit)
    : 0

  // AC - Субподряд прибыль = Y * (1 + коэф_суб_прибыль)
  const subProfit = subOOZ ? subOOZ * (1 + coefficients.subProfit) : 0

  // AD - Мат за ед в КП (для расчета AF)
  const matPerUnit =
    row.rowType === 'мат' && row.materialType === 'основ'
      ? matPZ
      : row.rowType === 'суб-мат' && row.materialType === 'основ'
        ? subPZ
        : 0

  // AF - Материалы в КП (итоговая стоимость материалов)
  const materialsInKP = matPerUnit

  // AG - Работы в КП (итоговая стоимость работ)
  let worksInKP = 0
  if (row.rowType === 'суб-раб') {
    worksInKP = subProfit
  } else if (row.rowType === 'раб') {
    worksInKP = workMatProfit + warranty
  } else if (row.rowType === 'мат' && row.materialType === 'основ') {
    // Для основных материалов вычитаем стоимость материалов
    worksInKP = workMatProfit - materialsInKP
  } else if (row.rowType === 'мат' && row.materialType === 'вспом') {
    // Для вспомогательных материалов все идет в работы
    worksInKP = workMatProfit
  } else if (row.rowType === 'мат' && !row.materialType) {
    // Если тип материала не указан, считаем как вспомогательный
    worksInKP = workMatProfit
  } else if (row.rowType === 'суб-мат' && row.materialType === 'основ') {
    worksInKP = subProfit - materialsInKP
  } else if (row.rowType === 'суб-мат' && row.materialType === 'вспом') {
    worksInKP = subProfit
  } else if (row.rowType === 'суб-мат' && !row.materialType) {
    // Если тип материала не указан, считаем как вспомогательный
    worksInKP = subProfit
  }

  return {
    total,
    workPZ,
    workSM,
    matMBP,
    matPZ,
    subPZ,
    warranty,
    work16,
    workGrowth,
    matGrowth,
    unforeseen,
    subOOZ,
    workMatOOZ,
    workMatOFZ,
    workMatProfit,
    subProfit,
    materialsInKP,
    worksInKP,
  }
}

/**
 * Вычисление общих итогов по всем строкам сметы
 *
 * @param rows - Массив строк сметы
 * @param coefficients - Коэффициенты для расчета
 * @returns Общая стоимость материалов, работ и итого
 */
export const calculateTotals = (
  rows: EstimateRow[],
  coefficients: EstimateCoefficients
): {
  totalMaterials: number
  totalWorks: number
  grandTotal: number
} => {
  let totalMaterials = 0
  let totalWorks = 0

  rows.forEach(row => {
    const calc = calculateRow(row, coefficients)
    totalMaterials += calc.materialsInKP
    totalWorks += calc.worksInKP
  })

  return {
    totalMaterials,
    totalWorks,
    grandTotal: totalMaterials + totalWorks,
  }
}

/**
 * Форматирование числа в валюту
 */
export const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('ru-RU', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}

/**
 * Форматирование числа в валюту с символом рубля
 */
export const formatCurrencyWithSymbol = (value: number): string => {
  return `${formatCurrency(value)} ₽`
}

/**
 * Расчет сумм для строки "Заказчик" из подчиненных строк
 * Суммирует "Мат в КП" из всех строк "мат" и "Раб в КП" из всех строк "раб"
 * до следующей строки "Заказчик"
 *
 * @param rows - Массив всех строк сметы
 * @param customerIndex - Индекс строки "Заказчик"
 * @param coefficients - Коэффициенты для расчета
 * @returns Объект с суммами материалов и работ
 */
export const calculateCustomerTotals = (
  rows: EstimateRow[],
  customerIndex: number,
  coefficients: EstimateCoefficients
): {
  materialsInKP: number
  worksInKP: number
} => {
  let materialsInKP = 0
  let worksInKP = 0

  console.log('📊 Расчет сумм для строки Заказчик', {
    customerIndex,
    customerName: rows[customerIndex]?.workName,
    timestamp: new Date().toISOString(),
  })

  // Проходим по всем строкам после строки "Заказчик" до следующей строки "Заказчик"
  for (let i = customerIndex + 1; i < rows.length; i++) {
    const row = rows[i]

    // Останавливаемся при встрече следующей строки "Заказчик"
    if (row.rowType === 'Заказчик') {
      console.log('⛔ Остановка на следующей строке Заказчик', {
        nextCustomerIndex: i,
        nextCustomerName: row.workName,
      })
      break
    }

    const calc = calculateRow(row, coefficients)

    // Суммируем материалы из строк "мат" и "суб-мат"
    if (row.rowType === 'мат' || row.rowType === 'суб-мат') {
      materialsInKP += calc.materialsInKP
      console.log('➕ Добавлены материалы', {
        rowName: row.workName,
        materialsAmount: calc.materialsInKP,
        totalMaterials: materialsInKP,
      })
    }

    // Суммируем работы из ВСЕХ строк (раб, суб-раб, мат, суб-мат)
    // Потому что в worksInKP каждой строки уже включены все накрутки
    worksInKP += calc.worksInKP
    console.log('➕ Добавлены работы (с накрутками)', {
      rowType: row.rowType,
      rowName: row.workName,
      worksAmount: calc.worksInKP,
      totalWorks: worksInKP,
    })
  }

  console.log('✅ Итоговые суммы для Заказчик', {
    materialsInKP,
    worksInKP,
    grandTotal: materialsInKP + worksInKP,
  })

  return {
    materialsInKP,
    worksInKP,
  }
}
