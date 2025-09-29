import { EstimateItem, EstimateExportOptions, EstimateCalculations } from '@/shared/types/estimate'
import { CSVParser } from './csvParser'

export class ExportUtils {
  static async exportToExcel(
    items: EstimateItem[],
    calculations: EstimateCalculations,
    options: EstimateExportOptions
  ): Promise<void> {
    console.log('ExportUtils: Начинаем экспорт в Excel', {
      itemsCount: items.length,
      options,
      timestamp: new Date().toISOString()
    })

    try {
      // Импортируем xlsx динамически для уменьшения размера бандла
      const XLSX = await import('xlsx')

      const workbook = XLSX.utils.book_new()

      // Подготавливаем данные для экспорта
      const flatItems = this.flattenItems(items)
      const exportData = flatItems.map(item => ({
        '№ п/п': item.number,
        'Заказчик': item.contractor,
        'Тип материала': item.materialType,
        'Наименование работ': item.workDescription,
        'Ед. изм.': item.unit,
        'Объем': item.volume || 0,
        'Коэф. расхода мат-лов': item.materialCoeff || '',
        'Цена работы, руб за ед.': item.workPrice || '',
        'Цена мат-лов с НДС без учета доставки': item.materialPriceWithVAT || '',
        'Доставка материалов': item.deliveryPrice || '',
        'Итого': item.total || 0
      }))

      // Создаем лист с данными
      const worksheet = XLSX.utils.json_to_sheet(exportData)

      // Добавляем заголовок
      if (options.title) {
        XLSX.utils.sheet_add_aoa(worksheet, [[options.title]], { origin: 'A1' })
        XLSX.utils.sheet_add_aoa(worksheet, [['']], { origin: 'A2' })
      }

      // Устанавливаем ширину колонок
      const columnWidths = [
        { wch: 8 },   // № п/п
        { wch: 12 },  // Заказчик
        { wch: 15 },  // Тип материала
        { wch: 50 },  // Наименование работ
        { wch: 8 },   // Ед. изм.
        { wch: 12 },  // Объем
        { wch: 15 },  // Коэф. расхода
        { wch: 15 },  // Цена работы
        { wch: 20 },  // Цена материалов
        { wch: 15 },  // Доставка
        { wch: 15 }   // Итого
      ]
      worksheet['!cols'] = columnWidths

      // Добавляем лист в книгу
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Смета')

      // Если нужно включить расчеты
      if (options.includeCalculations) {
        const summaryData = [
          ['Показатель', 'Значение'],
          ['Общая сумма, ₽', calculations.totalSum],
          ['Количество позиций', calculations.itemsCount],
          ['Общий объем', calculations.totalVolume],
          ['Стоимость работ, ₽', calculations.totalWorkCost],
          ['Стоимость материалов, ₽', calculations.totalMaterialCost],
          ['Стоимость доставки, ₽', calculations.totalDeliveryCost]
        ]

        const summaryWorksheet = XLSX.utils.aoa_to_sheet(summaryData)
        summaryWorksheet['!cols'] = [{ wch: 25 }, { wch: 20 }]
        XLSX.utils.book_append_sheet(workbook, summaryWorksheet, 'Итоги')
      }

      // Сохраняем файл
      const fileName = options.title
        ? `${options.title.replace(/[^\w\s]/gi, '')}.xlsx`
        : `smeta_${new Date().toISOString().split('T')[0]}.xlsx`

      XLSX.writeFile(workbook, fileName)

      console.log('ExportUtils: Экспорт в Excel завершен', {
        fileName,
        success: true
      })

    } catch (error) {
      console.error('ExportUtils: Ошибка экспорта в Excel', error)
      throw new Error('Ошибка при экспорте в Excel')
    }
  }

  static async exportToPDF(
    items: EstimateItem[],
    calculations: EstimateCalculations,
    options: EstimateExportOptions
  ): Promise<void> {
    console.log('ExportUtils: Начинаем экспорт в PDF', {
      itemsCount: items.length,
      options,
      timestamp: new Date().toISOString()
    })

    try {
      // Импортируем jsPDF динамически
      const jsPDF = (await import('jspdf')).default
      await import('jspdf-autotable')

      const doc = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4'
      })

      // Используем стандартный шрифт для кириллицы
      doc.setFont('helvetica')

      let yPosition = 20

      // Заголовок
      if (options.title) {
        doc.setFontSize(16)
        doc.text(options.title, 20, yPosition)
        yPosition += 15
      }

      // Описание
      if (options.description) {
        doc.setFontSize(12)
        doc.text(options.description, 20, yPosition)
        yPosition += 10
      }

      // Дата создания
      doc.setFontSize(10)
      doc.text(`Дата создания: ${new Date().toLocaleDateString('ru-RU')}`, 20, yPosition)
      yPosition += 15

      // Подготавливаем данные для таблицы
      const flatItems = this.flattenItems(items)
      const tableData = flatItems.map(item => [
        item.number,
        item.contractor,
        item.materialType,
        item.workDescription.length > 40
          ? item.workDescription.substring(0, 40) + '...'
          : item.workDescription,
        item.unit,
        this.formatNumber(item.volume || 0, 2),
        this.formatNumber(item.materialCoeff, 3),
        this.formatNumber(item.workPrice, 2),
        this.formatNumber(item.materialPriceWithVAT, 2),
        this.formatNumber(item.deliveryPrice, 2),
        this.formatNumber(item.total, 2)
      ])

      // Создаем таблицу
      (doc as any).autoTable({
        head: [[
          '№ п/п',
          'Заказчик',
          'Тип мат-ла',
          'Наименование работ',
          'Ед. изм.',
          'Объем',
          'Коэф.',
          'Цена раб.',
          'Цена мат.',
          'Доставка',
          'Итого'
        ]],
        body: tableData,
        startY: yPosition,
        theme: 'grid',
        styles: {
          fontSize: 8,
          cellPadding: 2
        },
        headStyles: {
          fillColor: [66, 139, 202],
          textColor: 255,
          fontSize: 8
        },
        columnStyles: {
          0: { cellWidth: 15 },  // № п/п
          1: { cellWidth: 20 },  // Заказчик
          2: { cellWidth: 20 },  // Тип материала
          3: { cellWidth: 60 },  // Наименование работ
          4: { cellWidth: 15 },  // Ед. изм.
          5: { cellWidth: 20 },  // Объем
          6: { cellWidth: 15 },  // Коэф.
          7: { cellWidth: 20 },  // Цена работы
          8: { cellWidth: 20 },  // Цена материалов
          9: { cellWidth: 20 },  // Доставка
          10: { cellWidth: 25 }  // Итого
        }
      })

      // Добавляем итоговую информацию
      if (options.includeCalculations) {
        const finalY = (doc as any).lastAutoTable.finalY + 20

        doc.setFontSize(12)
        doc.text('ИТОГОВАЯ ИНФОРМАЦИЯ:', 20, finalY)

        const summaryData = [
          ['Общая сумма:', this.formatCurrency(calculations.totalSum)],
          ['Количество позиций:', calculations.itemsCount.toString()],
          ['Общий объем:', this.formatNumber(calculations.totalVolume, 2)],
          ['Стоимость работ:', this.formatCurrency(calculations.totalWorkCost)],
          ['Стоимость материалов:', this.formatCurrency(calculations.totalMaterialCost)],
          ['Стоимость доставки:', this.formatCurrency(calculations.totalDeliveryCost)]
        ]

        (doc as any).autoTable({
          body: summaryData,
          startY: finalY + 10,
          theme: 'plain',
          styles: {
            fontSize: 10
          },
          columnStyles: {
            0: { cellWidth: 60, fontStyle: 'bold' },
            1: { cellWidth: 40, halign: 'right' }
          }
        })
      }

      // Сохраняем файл
      const fileName = options.title
        ? `${options.title.replace(/[^\w\s]/gi, '')}.pdf`
        : `smeta_${new Date().toISOString().split('T')[0]}.pdf`

      doc.save(fileName)

      console.log('ExportUtils: Экспорт в PDF завершен', {
        fileName,
        success: true
      })

    } catch (error) {
      console.error('ExportUtils: Ошибка экспорта в PDF', error)
      throw new Error('Ошибка при экспорте в PDF')
    }
  }

  static exportToCSV(items: EstimateItem[], options: EstimateExportOptions): void {
    console.log('ExportUtils: Начинаем экспорт в CSV', {
      itemsCount: items.length,
      options,
      timestamp: new Date().toISOString()
    })

    try {
      const csvContent = CSVParser.exportToCSV(items)

      // Создаем Blob с кодировкой Windows-1251
      const encoder = new TextEncoder()
      const data = encoder.encode(csvContent)

      const blob = new Blob([data], { type: 'text/csv;charset=windows-1251' })

      // Создаем ссылку для скачивания
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url

      const fileName = options.title
        ? `${options.title.replace(/[^\w\s]/gi, '')}.csv`
        : `smeta_${new Date().toISOString().split('T')[0]}.csv`

      link.download = fileName
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      window.URL.revokeObjectURL(url)

      console.log('ExportUtils: Экспорт в CSV завершен', {
        fileName,
        success: true
      })

    } catch (error) {
      console.error('ExportUtils: Ошибка экспорта в CSV', error)
      throw new Error('Ошибка при экспорте в CSV')
    }
  }

  private static flattenItems(items: EstimateItem[]): EstimateItem[] {
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

  private static formatNumber(value: number | undefined, decimals = 2): string {
    if (value === undefined || value === null) return ''
    return value.toLocaleString('ru-RU', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    })
  }

  private static formatCurrency(value: number): string {
    return value.toLocaleString('ru-RU', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }) + ' ₽'
  }
}