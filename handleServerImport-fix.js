// Исправленная функция handleServerImport для TenderTest.tsx
// Замените существующий блок обработки данных (строки 1207-1233) на этот код:

console.log('API Response:', {
  success: data.success,
  stats: data.stats,
  rawDataRows: data.data?.length || 0,
  timestamp: new Date().toISOString(),
})

if (data.success && data.data && data.data.length > 1) {
  // Преобразуем сырые данные из Excel в формат EstimatePosition
  const rawData = data.data
  const headers = rawData[0] // Первая строка - заголовки
  const dataRows = rawData.slice(1) // Остальные строки - данные

  console.log('📊 Парсинг данных Excel:', {
    headers,
    rowsCount: dataRows.length,
  })

  const importedPositions = dataRows
    .filter(row => row && row.length > 0 && row.some(cell => cell))
    .map((row, index) => {
      // Предполагаемая структура колонок (адаптируйте под вашу таблицу):
      // [№, Обоснование, Тип материала, Наименование, Ед.изм, Объем, Цена работ, Цена материалов]
      const [
        number,
        justification,
        materialType,
        workName,
        unit,
        volume,
        workPrice,
        materialPrice,
      ] = row

      const volumeNum = parseFloat(volume) || 1
      const workPriceNum = parseFloat(workPrice) || 0
      const materialPriceNum = parseFloat(materialPrice) || 0

      return {
        id: `server-import-${Date.now()}-${index}`,
        number: number?.toString() || `${positions.length + index + 1}`,
        justification: justification || 'раб',
        materialType: materialType || undefined,
        workName: workName || 'Импортированная позиция',
        unit: unit || 'шт',
        volume: volumeNum,
        workPrice: workPriceNum,
        materialPrice: materialPriceNum || undefined,
        deliveryPrice: undefined,
        total: volumeNum * (workPriceNum + materialPriceNum),
        level: 1,
        created_at: new Date().toISOString(),
      }
    })

  // Остальная часть кода остается прежней...
  setPositions(prev => [...prev, ...importedPositions])

  setModifiedPositions(prev => {
    const newSet = new Set(prev)
    importedPositions.forEach(pos => newSet.add(pos.id))
    return newSet
  })

  message.success(
    `Успешно импортировано ${importedPositions.length} позиций с сервера`
  )
  console.log('Server import result:', data)

  setGoogleSheetsModalVisible(false)
  setGoogleSheetsUrl('')
} else {
  message.error(data.message || 'Ошибка импорта: нет данных для импорта')
}
