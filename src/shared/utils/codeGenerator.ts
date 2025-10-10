/**
 * Утилиты для автоматической генерации кодов материалов и расценок
 */

// Префиксы для материалов по категориям
const MATERIAL_CODE_PREFIXES: Record<string, string> = {
  concrete: 'БЖБ', // Бетон и железобетон
  metal: 'МК', // Металлические конструкции
  brick: 'КК', // Кирпич и камень
  wood: 'ДМ', // Деревянные материалы
  roofing: 'КР', // Кровельные материалы
  insulation: 'ТИ', // Теплоизоляция
  finishing: 'ОМ', // Отделочные материалы
  plumbing: 'СТ', // Сантехника
  electrical: 'ЭО', // Электрооборудование
  facade: 'ФМ', // Фасадные материалы
  transparent: 'СК', // Светопрозрачные конструкции
  other: 'ПР', // Прочие материалы
}

// Префиксы для расценок по категориям
const RATE_CODE_PREFIXES: Record<string, string> = {
  общестроительные_работы: 'ОСР',
  фасадные_работы: 'ФР',
  благоустройство: 'БЛ',
  монолитные_работы: 'МР',
  оборудование: 'ОБ',
  материал: 'МТ',
  электромонтажные_работы: 'ЭМР',
  слаботочные_работы: 'СР',
  механические_работы: 'МХР',
  земляные_работы: 'ЗР',
  временные_здания_сооружения: 'ВЗС',
}

/**
 * Генерирует код для материала на основе категории
 * @param category - Категория материала
 * @param existingCodes - Массив существующих кодов для проверки уникальности
 * @returns Сгенерированный код
 */
export function generateMaterialCode(
  category: string,
  existingCodes: string[] = []
): string {
  const prefix = MATERIAL_CODE_PREFIXES[category] || 'МТ'

  // Находим все существующие коды с таким префиксом
  const codesWithPrefix = existingCodes.filter(code =>
    code.startsWith(prefix + '-')
  )

  // Извлекаем номера из существующих кодов
  const numbers = codesWithPrefix.map(code => {
    const match = code.match(/\d+$/)
    return match ? parseInt(match[0], 10) : 0
  })

  // Находим максимальный номер
  const maxNumber = numbers.length > 0 ? Math.max(...numbers) : 0

  // Генерируем новый номер (следующий за максимальным)
  const newNumber = maxNumber + 1

  // Форматируем номер с ведущими нулями (3 знака)
  const formattedNumber = newNumber.toString().padStart(3, '0')

  return `${prefix}-${formattedNumber}`
}

/**
 * Генерирует код для расценки на основе категории
 * @param category - Категория расценки
 * @param existingCodes - Массив существующих кодов для проверки уникальности
 * @returns Сгенерированный код
 */
export function generateRateCode(
  category: string,
  existingCodes: string[] = []
): string {
  const prefix = RATE_CODE_PREFIXES[category] || 'РЦ'

  // Находим все существующие коды с таким префиксом
  const codesWithPrefix = existingCodes.filter(code =>
    code.startsWith(prefix + '-')
  )

  // Извлекаем номера из существующих кодов
  const numbers = codesWithPrefix.map(code => {
    const match = code.match(/\d+$/)
    return match ? parseInt(match[0], 10) : 0
  })

  // Находим максимальный номер
  const maxNumber = numbers.length > 0 ? Math.max(...numbers) : 0

  // Генерируем новый номер (следующий за максимальным)
  const newNumber = maxNumber + 1

  // Форматируем номер с ведущими нулями (3 знака)
  const formattedNumber = newNumber.toString().padStart(3, '0')

  return `${prefix}-${formattedNumber}`
}

/**
 * Проверяет уникальность кода
 * @param code - Код для проверки
 * @param existingCodes - Массив существующих кодов
 * @returns true если код уникален
 */
export function isCodeUnique(code: string, existingCodes: string[]): boolean {
  return !existingCodes.includes(code)
}
