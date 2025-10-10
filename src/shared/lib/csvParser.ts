import { EstimateItem, CSVParseResult } from '@/shared/types/estimate'

export class CSVParser {
  private static readonly COLUMNS = [
    'number', // № п/п
    'contractor', // Заказчик
    'materialType', // Тип материала
    'workDescription', // Наименование работ
    'unit', // Ед. изм.
    'volume', // Объем
    'materialCoeff', // Коэф. расхода мат-лов
    'workPrice', // Цена работы, руб за ед.
    'materialPriceWithVAT', // Цена мат-лов с НДС без учета доставки
    'deliveryPrice', // Доставка материалов
    'total', // Итого
  ]

  static async parseFile(file: globalThis.File): Promise<CSVParseResult> {
    console.log('CSV Parser: Начинаем парсинг файла', {
      fileName: file.name,
      fileSize: file.size,
      timestamp: new Date().toISOString(),
    })

    const result: CSVParseResult = {
      data: [],
      errors: [],
      totalRows: 0,
      skippedRows: 0,
    }

    try {
      const text = await this.readFileAsText(file)
      const lines = text.split('\n').filter(line => line.trim())
      result.totalRows = lines.length

      console.log('CSV Parser: Файл прочитан', {
        totalLines: lines.length,
        encoding: 'windows-1251',
      })

      // Пропускаем заголовок, если есть
      const dataLines = lines.slice(1)

      for (let i = 0; i < dataLines.length; i++) {
        try {
          const item = this.parseLine(dataLines[i], i + 2) // +2 для корректного номера строки (заголовок + 1-based)
          if (item) {
            result.data.push(item)
          } else {
            result.skippedRows++
          }
        } catch (error) {
          result.errors.push(
            `Строка ${i + 2}: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`
          )
          result.skippedRows++
        }
      }

      // Построение иерархии
      result.data = this.buildHierarchy(result.data)

      console.log('CSV Parser: Парсинг завершен', {
        parsedItems: result.data.length,
        errors: result.errors.length,
        skippedRows: result.skippedRows,
        success: result.errors.length === 0,
      })
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Неизвестная ошибка'
      result.errors.push(`Ошибка чтения файла: ${errorMessage}`)
      console.error('CSV Parser: Критическая ошибка', error)
    }

    return result
  }

  private static async readFileAsText(file: globalThis.File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new window.FileReader()

      reader.onload = event => {
        try {
          const arrayBuffer = event.target?.result as ArrayBuffer
          // Декодируем из Windows-1251
          const decoder = new window.TextDecoder('windows-1251')
          const text = decoder.decode(arrayBuffer)
          resolve(text)
        } catch (_error) {
          reject(new Error('Ошибка декодирования файла'))
        }
      }

      reader.onerror = () => reject(new Error('Ошибка чтения файла'))
      reader.readAsArrayBuffer(file)
    })
  }

  private static parseLine(
    line: string,
    lineNumber: number
  ): EstimateItem | null {
    // Разделяем по точке с запятой или табуляции
    const cells = line
      .split(/[;\t]/)
      .map(cell => cell.trim().replace(/^"|"$/g, ''))

    if (cells.length < 11) {
      throw new Error(
        `Недостаточно колонок: ожидается 11, получено ${cells.length}`
      )
    }

    // Проверяем, не пустая ли строка
    if (cells.every(cell => !cell)) {
      return null
    }

    const number = cells[0]
    if (!number) {
      return null
    }

    // Определяем уровень вложенности по номеру позиции
    const level = (number.match(/\./g) || []).length

    const item: EstimateItem = {
      id: `item_${lineNumber}_${Date.now()}`,
      number,
      level,
      contractor: cells[1] || '',
      materialType: cells[2] || '',
      workDescription: cells[3] || '',
      unit: cells[4] || '',
      volume: this.parseNumber(cells[5]) || 0,
      materialCoeff: this.parseNumber(cells[6]),
      workPrice: this.parseNumber(cells[7]),
      materialPriceWithVAT: this.parseNumber(cells[8]),
      deliveryPrice: this.parseNumber(cells[9]),
      total: this.parseNumber(cells[10]) || 0,
      isExpanded: true,
      isModified: false,
    }

    return item
  }

  private static parseNumber(value: string): number | undefined {
    if (!value || value.trim() === '') return undefined

    // Заменяем запятые на точки и убираем пробелы
    const cleanValue = value.replace(/,/g, '.').replace(/\s/g, '')
    const parsed = parseFloat(cleanValue)

    return isNaN(parsed) ? undefined : parsed
  }

  private static buildHierarchy(items: EstimateItem[]): EstimateItem[] {
    const result: EstimateItem[] = []
    const stack: EstimateItem[] = []

    for (const item of items) {
      // Удаляем элементы из стека, которые не являются родителями текущего элемента
      while (stack.length > 0 && stack[stack.length - 1].level >= item.level) {
        stack.pop()
      }

      // Если есть родитель в стеке
      if (stack.length > 0) {
        const parent = stack[stack.length - 1]
        item.parentId = parent.id

        if (!parent.children) {
          parent.children = []
        }
        parent.children.push(item)
      } else {
        // Элемент верхнего уровня
        result.push(item)
      }

      stack.push(item)
    }

    return result
  }

  static exportToCSV(items: EstimateItem[]): string {
    const headers = [
      '№ п/п',
      'Заказчик',
      'Тип материала',
      'Наименование работ',
      'Ед. изм.',
      'Объем',
      'Коэф. расхода мат-лов',
      'Цена работы, руб за ед.',
      'Цена мат-лов с НДС без учета доставки',
      'Доставка материалов',
      'Итого',
    ]

    const flatItems = this.flattenHierarchy(items)

    const csvContent = [
      headers.join(';'),
      ...flatItems.map(item =>
        [
          item.number,
          item.contractor,
          item.materialType,
          item.workDescription,
          item.unit,
          item.volume?.toString().replace('.', ',') || '',
          item.materialCoeff?.toString().replace('.', ',') || '',
          item.workPrice?.toString().replace('.', ',') || '',
          item.materialPriceWithVAT?.toString().replace('.', ',') || '',
          item.deliveryPrice?.toString().replace('.', ',') || '',
          item.total.toString().replace('.', ','),
        ].join(';')
      ),
    ].join('\n')

    console.log('CSV Parser: Экспорт в CSV завершен', {
      itemsCount: flatItems.length,
      timestamp: new Date().toISOString(),
    })

    return csvContent
  }

  private static flattenHierarchy(items: EstimateItem[]): EstimateItem[] {
    const result: EstimateItem[] = []

    const traverse = (items: EstimateItem[]) => {
      for (const item of items) {
        result.push(item)
        if (item.children) {
          traverse(item.children)
        }
      }
    }

    traverse(items)
    return result
  }
}
