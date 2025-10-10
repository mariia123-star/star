import express from 'express'
import cors from 'cors'
import fetch from 'node-fetch'
import XLSX from 'xlsx'

const app = express()
const PORT = 3001

// Middleware
app.use(cors())
app.use(express.json())

// Логирование запросов
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`)
  next()
})

/**
 * API endpoint для импорта данных из Google Sheets
 * POST /api/import/google-sheets
 * Body: { url: string }
 */
app.post('/api/import/google-sheets', async (req, res) => {
  console.log('📥 Google Sheets import request received')

  try {
    const { url } = req.body

    if (!url) {
      return res.status(400).json({
        success: false,
        error: 'URL not provided',
      })
    }

    console.log('🔗 Import URL:', url)

    // Конвертируем URL в формат экспорта Excel
    let exportUrl = url

    // Извлекаем ID таблицы и gid (если есть)
    const spreadsheetIdMatch = url.match(/\/d\/([a-zA-Z0-9-_]+)/)
    const gidMatch = url.match(/[#&?]gid=(\d+)/)

    if (spreadsheetIdMatch) {
      const spreadsheetId = spreadsheetIdMatch[1]
      exportUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=xlsx`

      if (gidMatch) {
        exportUrl += `&gid=${gidMatch[1]}`
      }
    }

    console.log('📤 Export URL:', exportUrl)

    // Загружаем файл
    console.log('⬇️ Downloading file...')
    const response = await fetch(exportUrl)

    if (!response.ok) {
      throw new Error(`Failed to fetch Google Sheet: ${response.statusText}`)
    }

    // Получаем данные как буфер
    const arrayBuffer = await response.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    console.log('📊 Parsing Excel data...')

    // Парсим Excel
    const workbook = XLSX.read(buffer, { type: 'buffer' })

    // Берем первый лист
    const sheetName = workbook.SheetNames[0]
    const worksheet = workbook.Sheets[sheetName]

    // Конвертируем в JSON
    const jsonData = XLSX.utils.sheet_to_json(worksheet, {
      header: 1, // Возвращает массив массивов
      defval: '', // Значение по умолчанию для пустых ячеек
      blankrows: false, // Пропускаем пустые строки
    })

    console.log('✅ Data parsed successfully')
    console.log('📈 Stats:', {
      sheets: workbook.SheetNames.length,
      rows: jsonData.length,
      columns: jsonData[0]?.length || 0,
    })

    res.json({
      success: true,
      data: jsonData,
      stats: {
        sheets: workbook.SheetNames.length,
        sheetNames: workbook.SheetNames,
        rows: jsonData.length,
        columns: jsonData[0]?.length || 0,
      },
    })
  } catch (error) {
    console.error('❌ Import error:', error)
    res.status(500).json({
      success: false,
      error: error.message,
    })
  }
})

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
  })
})

// Запуск сервера
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`)
  console.log(`📋 Available endpoints:`)
  console.log(`   GET  /health`)
  console.log(`   POST /api/import/google-sheets`)
})
