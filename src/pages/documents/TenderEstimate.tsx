import React, { useState } from 'react'
import {
  Table,
  Button,
  Space,
  Typography,
  Form,
  Input,
  InputNumber,
  Select,
  message,
  Popconfirm,
  Row,
  Col,
  Modal,
  Upload,
  Divider,
} from 'antd'
import {
  PlusOutlined,
  CalculatorOutlined,
  ProjectOutlined,
  UploadOutlined,
  FileExcelOutlined,
  LinkOutlined,
  CloudOutlined,
} from '@ant-design/icons'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { unitsApi } from '@/entities/units'
import { projectsApi } from '@/shared/api/projects'
import { materialTypesApi } from '@/shared/api/material-types'
import { tenderEstimatesApi } from '@/entities/tender-estimates'
import * as XLSX from 'xlsx'

const { Title } = Typography

interface EstimateFormData {
  materials: string
  works: string
  quantity: number
  unit_id: string
  unit_price?: number
  total_price?: number
  notes?: string
  // Дополнительные поля для UI
  customer?: string
  work_name?: string
  row_number?: string        // Номер строки для иерархии (1, 1.1, 1.1.1)
  // Новые поля для расширенной тендерной сметы
  material_type?: string       // Тип материала (Основ/Вспом)
  coefficient?: number         // Коэффициент расхода материала
  work_price?: number         // Цена работы за единицу
  material_price?: number     // Цена материала с НДС
  delivery?: number           // Стоимость доставки (используется при импорте)
  delivery_cost?: number      // Стоимость доставки (для API)
  record_type?: 'work' | 'material' | 'summary'  // Тип записи
}

function TenderEstimate() {
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(
    null
  )
  const [editingKey, setEditingKey] = useState('')
  const [newRowData, setNewRowData] = useState<EstimateFormData | null>(null)
  const [form] = Form.useForm<EstimateFormData>()
  const [importModalVisible, setImportModalVisible] = useState(false)
  const [importForm] = Form.useForm()
  const [uploading, setUploading] = useState(false)

  const queryClient = useQueryClient()

  const { data: estimates = [], isLoading: estimatesLoading } = useQuery({
    queryKey: ['tender-estimates', selectedProjectId],
    queryFn: () => {
      if (selectedProjectId) {
        return tenderEstimatesApi.getAll({ projectId: selectedProjectId })
      }
      return []
    },
    enabled: !!selectedProjectId,
  })

  const { data: units = [] } = useQuery({
    queryKey: ['units'],
    queryFn: unitsApi.getAll,
  })

  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: projectsApi.getAll,
  })

  const { data: materialTypes = [] } = useQuery({
    queryKey: ['material-types'],
    queryFn: materialTypesApi.getAll,
  })

  const createMutation = useMutation({
    mutationFn: async (data: EstimateFormData) => {
      console.log('Creating tender estimate:', data)
      
      const defaultUnit = units[0]
      if (!defaultUnit) {
        throw new Error('Нет доступных единиц измерения')
      }
      
      const estimate = {
        materials: data.materials || '',
        works: data.works || '',
        quantity: Number(data.quantity) || 1,
        unit_id: data.unit_id || defaultUnit.id,
        unit_price: Number(data.unit_price) || 0,
        notes: data.notes || ''
      }
      
      return await tenderEstimatesApi.create(estimate)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tender-estimates'] })
      message.success('Смета успешно создана')
      handleCloseModal()
    },
    onError: error => {
      console.error('Create error:', error)
      message.error('Ошибка при создании сметы')
    },
  })

  const updateMutation = useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string
      data: EstimateFormData
    }) => {
      console.log('Updating tender estimate:', { id, data })
      
      const estimate = {
        materials: data.materials || '',
        works: data.works || '',
        quantity: Number(data.quantity) || 1,
        unit_id: data.unit_id,
        unit_price: Number(data.unit_price) || 0,
        notes: data.notes
      }
      
      return await tenderEstimatesApi.update(id, estimate)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tender-estimates'] })
      message.success('Смета успешно обновлена')
      handleCloseModal()
    },
    onError: error => {
      console.error('Update error:', error)
      message.error('Ошибка при обновлении сметы')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      console.log('Deleting tender estimate:', id)
      return await tenderEstimatesApi.delete(id)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tender-estimates'] })
      message.success('Смета успешно удалена')
    },
    onError: error => {
      console.error('Delete error:', error)
      message.error('Ошибка при удалении сметы')
    },
  })

  const handleProjectChange = (projectId: string | null) => {
    console.log('Project selection changed:', {
      oldProjectId: selectedProjectId,
      newProjectId: projectId,
      timestamp: new Date().toISOString(),
    })
    setSelectedProjectId(projectId)
  }

  const handleAddNewRow = () => {
    console.log('Adding new row', {
      action: 'add_new_row',
      selectedProjectId,
      timestamp: new Date().toISOString(),
    })

    if (!selectedProjectId) {
      message.warning('Сначала выберите проект для создания сметы')
      return
    }

    const newRow: EstimateFormData = {
      project_id: selectedProjectId,
      material_type_id: null,
      customer: null,
      work_name: '',
      unit_id: '',
      volume: 0,
      material_consumption_ratio: 1.0,
      work_price: 0,
      material_price_with_vat: 0,
      delivery_price: 0,
      notes: '',
    }

    setNewRowData(newRow)
    setEditingKey('new')
    form.setFieldsValue(newRow)
  }

  const formatCurrency = (value?: number) => {
    if (!value) return '—'
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: 'RUB',
    }).format(value)
  }

  const handleEdit = (record: any) => {
    console.log('Edit row:', record.id)
    setEditingKey(record.id)
    form.setFieldsValue(record)
  }

  const handleSave = async (id: string) => {
    try {
      const values = await form.validateFields()
      console.log('Saving row:', { id, values })

      if (id === 'new') {
        createMutation.mutate(values)
      } else {
        updateMutation.mutate({ id, data: values })
      }
    } catch (error) {
      console.error('Form validation error:', error)
      message.error('Пожалуйста, заполните все обязательные поля')
    }
  }

  const handleCloseModal = () => {
    setEditingKey('')
    setNewRowData(null)
    form.resetFields()
  }

  const handleCancel = () => {
    console.log('Cancel editing')
    handleCloseModal()
  }

  const handleImportData = async (values: any) => {
    console.log('Import data received:', values)
    console.log('Selected project ID:', selectedProjectId)
    
    if (!selectedProjectId) {
      message.error('Пожалуйста, сначала выберите проект')
      return
    }
    setUploading(true)

    try {
      if (values.sourceType === 'file') {
        console.log('Processing file upload...')
        console.log('File data structure:', {
          file: values.file,
          fileFile: values.file?.file,
          fileList: values.file?.fileList,
          originFileObj: values.file?.fileList?.[0]?.originFileObj
        })
        
        // Ant Design Upload компонент сохраняет файлы в разных форматах
        const file = values.file?.fileList?.[0]?.originFileObj || 
                    values.file?.fileList?.[0] || 
                    values.file?.file || 
                    values.file
        
        if (!file) {
          throw new Error('Файл не выбран или не найден')
        }
        
        console.log('File found:', {
          name: file.name,
          type: file.type,
          size: file.size
        })
        
        await processFile(file)
      } else if (values.sourceType === 'url') {
        if (values.url) {
          await processUrl(values.url)
        }
      } else if (values.sourceType === 'googleSheets') {
        if (values.googleSheetsUrl) {
          await processGoogleSheets(values.googleSheetsUrl)
        }
      }

      message.success('Данные успешно импортированы')
      setImportModalVisible(false)
      importForm.resetFields()
      queryClient.invalidateQueries({ queryKey: ['tender-estimates'] })
    } catch (error) {
      console.error('Import error:', error)
      message.error(`Ошибка при импорте данных: ${error}`)
    } finally {
      setUploading(false)
    }
  }

  const processFile = async (file: File) => {
    console.log('=== Starting file processing ===')
    console.log('Processing file:', file.name, file.type, 'Size:', file.size)
    console.log('Selected project for import:', selectedProjectId)

    const supportedTypes = [
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/csv',
      'application/json',
      'text/plain',
    ]

    if (
      !supportedTypes.includes(file.type) &&
      !file.name.match(/\.(xlsx?|csv|json|txt)$/i)
    ) {
      throw new Error(
        'Неподдерживаемый формат файла. Поддерживаются: Excel (.xlsx, .xls), CSV, JSON, TXT'
      )
    }

    let parsedData: any[] = []

    try {
      if (file.name.match(/\.json$/i)) {
        // JSON файл
        const content = await readFileAsText(file)
        parsedData = JSON.parse(content)
      } else if (file.name.match(/\.(csv|txt)$/i)) {
        // CSV или TXT файл
        console.log('Reading CSV/TXT file with encoding detection...')
        console.log('About to call readFileAsTextWithFallback...')
        const content = await readFileAsTextWithFallback(file)
        console.log('readFileAsTextWithFallback completed, content length:', content?.length)
        parsedData = parseCSV(content)
      } else if (file.name.match(/\.xlsx?$/i)) {
        // Excel файл - используем библиотеку xlsx
        console.log('Excel файл обнаружен, парсим...')
        parsedData = await parseExcelFile(file)
      }

      console.log('Parsed data sample:', parsedData.slice(0, 3))
      console.log('Total parsed rows:', parsedData.length)

      console.log('Converting data to estimate format...')
      const convertedData = convertToEstimateData(parsedData)
      console.log('Converted data sample:', convertedData.slice(0, 2))
      
      console.log('Adding imported data to database...')
      await addImportedData(convertedData)
      
      console.log('=== File processing completed successfully ===')
      return parsedData
    } catch (error) {
      console.error('Error processing file:', error)
      throw new Error(`Ошибка обработки файла: ${error}`)
    }
  }

  const parseExcelFile = (file: File): Promise<any[]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = e => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer)
          const workbook = XLSX.read(data, { type: 'array' })
          
          // Берем первый лист
          const sheetName = workbook.SheetNames[0]
          const worksheet = workbook.Sheets[sheetName]
          
          // Конвертируем в JSON
          const jsonData = XLSX.utils.sheet_to_json(worksheet, {
            header: 1, // Используем номера строк как заголовки
            defval: '', // Значение по умолчанию для пустых ячеек
          }) as any[][]
          
          console.log('Raw Excel data:', jsonData.slice(0, 5))
          
          if (jsonData.length < 2) {
            reject(new Error('Excel файл должен содержать заголовки и минимум одну строку данных'))
            return
          }
          
          // Преобразуем массив массивов в массив объектов
          const headers = jsonData[0].map((header: any) => 
            String(header || '').trim().toLowerCase()
          )
          const rows = jsonData.slice(1).filter(row => 
            row.some(cell => cell !== null && cell !== undefined && cell !== '')
          )
          
          const parsedData = rows.map(row => {
            const obj: any = {}
            headers.forEach((header, index) => {
              if (header) {
                obj[header] = row[index] || ''
              }
            })
            return obj
          })
          
          console.log('Parsed Excel data:', parsedData.slice(0, 3))
          resolve(parsedData)
        } catch (error) {
          console.error('Error parsing Excel file:', error)
          reject(new Error(`Ошибка парсинга Excel файла: ${error}`))
        }
      }
      reader.onerror = () => reject(new Error('Ошибка чтения файла'))
      reader.readAsArrayBuffer(file)
    })
  }

  const readFileAsText = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = e => {
        resolve(e.target?.result as string)
      }
      reader.onerror = () => reject(new Error('Ошибка чтения файла'))
      // Попробуем разные кодировки для правильного чтения русского текста
      reader.readAsText(file, 'utf-8')
    })
  }

  const readFileAsTextWithFallback = async (file: File): Promise<string> => {
    console.log('🔄 Attempting to read file with different encodings...')
    console.log('File details:', { name: file.name, size: file.size, type: file.type })
    
    // Пробуем читать файл как ArrayBuffer и затем декодировать
    try {
      const arrayBuffer = await new Promise<ArrayBuffer>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = e => resolve(e.target?.result as ArrayBuffer)
        reader.onerror = () => reject(new Error('ArrayBuffer read failed'))
        reader.readAsArrayBuffer(file)
      })
      
      console.log('ArrayBuffer read successful, size:', arrayBuffer.byteLength)
      
      // Пробуем различные кодировки
      const uint8Array = new Uint8Array(arrayBuffer)
      
      // UTF-8 декодирование
      try {
        const utf8Text = new TextDecoder('utf-8', { fatal: false }).decode(uint8Array)
        console.log('UTF-8 decoded preview:', utf8Text.substring(0, 100))
        
        if (utf8Text.includes('Заказчик') || utf8Text.includes('заказчик') || /[а-яё]/i.test(utf8Text)) {
          console.log('✅ UTF-8 encoding detected Russian text correctly')
          return utf8Text
        }
      } catch (e) {
        console.log('UTF-8 decode failed:', e)
      }
      
      // Windows-1251 декодирование
      try {
        const win1251Text = new TextDecoder('windows-1251', { fatal: false }).decode(uint8Array)
        console.log('Windows-1251 decoded preview:', win1251Text.substring(0, 100))
        
        if (win1251Text.includes('Заказчик') || win1251Text.includes('заказчик') || /[а-яё]/i.test(win1251Text)) {
          console.log('✅ Windows-1251 encoding detected Russian text correctly')
          return win1251Text
        }
      } catch (e) {
        console.log('Windows-1251 decode failed:', e)
      }
      
      // Если ничего не сработало, используем UTF-8 как fallback
      console.log('⚠️ Using UTF-8 as fallback...')
      const fallbackText = new TextDecoder('utf-8', { fatal: false }).decode(uint8Array)
      console.log('Fallback text preview:', fallbackText.substring(0, 100))
      return fallbackText
      
    } catch (e) {
      console.error('❌ All encoding attempts failed:', e)
      
      // Последний fallback - стандартное чтение файла
      console.log('Using standard FileReader as last resort...')
      return new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = e => {
          const text = e.target?.result as string
          console.log('Standard read preview:', text.substring(0, 100))
          resolve(text)
        }
        reader.onerror = () => reject(new Error('Standard read failed'))
        reader.readAsText(file)
      })
    }
  }


  const parseCSV = (csvText: string): any[] => {
    console.log('=== Parsing CSV data ===')
    console.log('Raw CSV text length:', csvText.length)
    console.log('Raw CSV preview:', csvText.substring(0, 200))
    
    if (!csvText || csvText.trim().length === 0) {
      console.log('ERROR: CSV text is empty')
      return []
    }
    
    // Сначала попробуем найти строку с фактическими заголовками
    // Ищем строку, которая содержит ключевые поля
    const lines = csvText.trim().split('\n')
    console.log('CSV lines found:', lines.length)
    console.log('First few lines:', lines.slice(0, 5))
    
    if (lines.length < 1) {
      console.log('ERROR: No lines found in CSV')
      return []
    }
    
    // Найдем строку с заголовками - она должна содержать основные поля
    let headerLineIndex = -1
    let headers: string[] = []
    
    for (let i = 0; i < Math.min(lines.length, 10); i++) {
      const potentialHeaders = lines[i]
        .split(/[,;|\t]/)
        .map(h => h.trim().replace(/"/g, '').replace(/\n/g, ' '))
      
      console.log(`Line ${i} potential headers:`, potentialHeaders)
      
      // Проверяем, содержит ли строка основные поля CSV для тендерной сметы
      const hasMainFields = potentialHeaders.some(h => {
        const lowerH = h.toLowerCase()
        // Ищем специфические поля тендерной сметы
        return lowerH.includes('заказчик') ||
               lowerH.includes('наименование') ||
               lowerH.includes('ед.') ||
               lowerH.includes('объем') ||
               lowerH.includes('цена') ||
               lowerH.includes('итого') ||
               lowerH.includes('коэф') ||
               lowerH.includes('доставка') ||
               // Поиск по типичным единицам измерения
               (lowerH.length > 1 && (lowerH.includes('м3') || lowerH.includes('м2') || lowerH.includes('кг') || lowerH.includes('шт') || lowerH.includes('т'))) ||
               // Поиск по английским эквивалентам
               lowerH.includes('customer') ||
               lowerH.includes('name') ||
               lowerH.includes('unit') ||
               lowerH.includes('quantity') ||
               lowerH.includes('price') ||
               lowerH.includes('work') ||
               lowerH.includes('material')
      })
      
      if (hasMainFields && potentialHeaders.length >= 5) {
        headerLineIndex = i
        headers = potentialHeaders
        console.log(`Found headers at line ${i}:`, headers)
        break
      }
    }
    
    if (headerLineIndex === -1) {
      console.log('Could not find header line with main fields, trying structural analysis...')
      
      // Fallback: ищем строку с максимальным количеством непустых колонок
      let bestLineIndex = -1
      let maxColumns = 0
      
      for (let i = 0; i < Math.min(lines.length, 10); i++) {
        const cols = lines[i].split(/[,;|\t]/).map(h => h.trim().replace(/"/g, ''))
        const nonEmptyColumns = cols.filter(col => col.length > 0).length
        
        console.log(`Line ${i} has ${nonEmptyColumns} non-empty columns out of ${cols.length}`)
        
        if (nonEmptyColumns > maxColumns && cols.length >= 5) {
          maxColumns = nonEmptyColumns
          bestLineIndex = i
        }
      }
      
      if (bestLineIndex !== -1) {
        console.log(`Using line ${bestLineIndex} as headers (${maxColumns} non-empty columns)`)
        headerLineIndex = bestLineIndex
        headers = lines[bestLineIndex]
          .split(/[,;|\t]/)
          .map(h => h.trim().replace(/"/g, '').replace(/\n/g, ' '))
      } else {
        // Последний fallback: используем первую строку
        console.log('Using first line as fallback headers')
        headerLineIndex = 0
        headers = lines[0]
          .split(/[,;|\t]/)
          .map(h => h.trim().replace(/"/g, '').replace(/\n/g, ' '))
      }
    }
    
    // Для тендерной сметы принудительно устанавливаем правильные заголовки
    const tenderHeaders = [
      '№ п/п',           // 0
      'Заказчик',        // 1  
      'Тип Материала',   // 2
      'Наименование работ', // 3
      'Ед. изм.',        // 4
      'Объем',           // 5
      'Коэф. расхода мат-ла', // 6
      'Цена работы',     // 7
      'Цена мат-ла с НДС', // 8
      'Доставка материала', // 9
      'Итого'           // 10
    ]
    
    // Используем специальные заголовки для тендерной сметы
    headers = tenderHeaders
    console.log('Using tender estimate headers:', headers)
    
    const data: any[] = []
    
    // Для тендерной сметы данные начинаются с 3 строки (индекс 2)
    const dataStartIndex = 2
    console.log(`Starting to parse data from line ${dataStartIndex}`)
    
    for (let i = dataStartIndex; i < lines.length; i++) {
      if (!lines[i] || lines[i].trim() === '') {
        console.log(`Skipping empty line ${i}`)
        continue
      }
      
      const values = lines[i]
        .split(/[,;|\t]/)
        .map(v => v.trim().replace(/"/g, ''))
        
      console.log(`Row ${i}:`, values.slice(0, 5), '... (showing first 5 values)')
      
      // Разрешаем большие расхождения в количестве колонок для тендерной сметы
      if (values.length >= 5) { // Минимум 5 колонок для валидной строки
        const row: any = {}
        
        // Сопоставляем значения с заголовками, включая лишние колонки
        for (let j = 0; j < headers.length && j < values.length; j++) {
          const header = headers[j]
          const value = values[j] || ''
          if (header && header.trim()) {
            row[header] = value
          }
        }
        
        // Добавляем дополнительные колонки как col{index}
        for (let j = headers.length; j < values.length; j++) {
          const value = values[j] || ''
          if (value.trim()) {
            row[`col${j}`] = value
          }
        }
        
        // Проверяем, что в строке есть хоть какие-то данные
        const hasData = Object.values(row).some(v => v && v.toString().trim())
        if (hasData) {
          data.push(row)
          if (data.length <= 2) {
            console.log(`Parsed row ${i}:`, row)
          }
        } else {
          console.log(`Skipping row ${i}: insufficient data (${values.length} values)`)
        }
      }
    }

    console.log('Final parsed CSV data:', data.length, 'rows')
    console.log('Sample parsed data:', data.slice(0, 2))
    return data
  }

  const convertToEstimateData = (rawData: any[]): EstimateFormData[] => {
    console.log('=== Converting raw data to estimate format ===')
    console.log('Raw data input:', rawData.length, 'rows')
    console.log('Sample raw row:', rawData[0])
    console.log('Raw data keys:', Object.keys(rawData[0] || {}))
    
    const result = rawData.map((row, index) => {
      console.log(`Processing row ${index}:`, row)
      
      const getField = (possibleNames: string[]) => {
        for (const name of possibleNames) {
          if (
            row[name] !== undefined &&
            row[name] !== null &&
            row[name] !== ''
          ) {
            console.log(`Found field "${name}": "${row[name]}"`)
            return row[name]
          }
        }
        console.log(`No field found for names:`, possibleNames)
        return ''
      }

      const getNumberField = (possibleNames: string[]): number => {
        const value = getField(possibleNames)
        const parsed = (
          parseFloat(
            value
              ?.toString()
              ?.replace(/[^\d.,]/g, '')
              .replace(',', '.')
          ) || 0
        )
        console.log(`Number field "${possibleNames[0]}": "${value}" -> ${parsed}`)
        return parsed
      }

      // Парсинг по фиксированным индексам (структура tets1.csv)
      // Колонки: № п/п | Заказчик | Тип материала | Наименование работ | Ед. изм. | Объем | Коэф. расхода | Цена работы | Цена мат-ла | Доставка | Итого
      
      const rowKeys = Object.keys(row)
      
      // Функция для получения значения по индексу
      const getValueByIndex = (index: number): string => {
        const key = rowKeys[index]
        const value = row[key]
        return value !== undefined && value !== null ? String(value).trim() : ''
      }

      // Функция для числовых значений по индексу
      const getNumberByIndex = (index: number): number => {
        const value = getValueByIndex(index)
        if (!value) return 0
        // Заменяем запятые на точки для корректного парсинга
        const normalizedValue = value.replace(/[^\d.,\-]/g, '').replace(',', '.')
        return parseFloat(normalizedValue) || 0
      }

      // Парсинг по фиксированным позициям
      const rowNumber = getValueByIndex(0)      // Колонка 1: № п/п
      const customer = getValueByIndex(1)       // Колонка 2: Заказчик 
      const materialType = getValueByIndex(2)   // Колонка 3: Тип материала
      const workName = getValueByIndex(3)       // Колонка 4: Наименование работ
      const unitText = getValueByIndex(4)       // Колонка 5: Ед. изм.
      const volume = getNumberByIndex(5)        // Колонка 6: Объем
      const coefficient = getNumberByIndex(6)   // Колонка 7: Коэф. расхода
      const workPrice = getNumberByIndex(7)     // Колонка 8: Цена работы
      const materialPrice = getNumberByIndex(8) // Колонка 9: Цена мат-ла с НДС
      const delivery = getNumberByIndex(9)      // Колонка 10: Доставка
      const total = getNumberByIndex(10)        // Колонка 11: Итого
      
      // Логирование для отладки
      console.log(`Row ${index}: №="${rowNumber}", Заказчик="${customer}", Тип="${materialType}", Работа="${workName}"`)
      console.log(`  Ед.изм="${unitText}", Объем=${volume}, Коэф=${coefficient}`)
      console.log(`  Цена работы=${workPrice}, Цена мат-ла=${materialPrice}, Доставка=${delivery}, Итого=${total}`)
      
      // Находим единицу измерения по тексту
      const matchedUnit = units.find(unit => 
        unit.short_name === unitText || 
        unit.name.toLowerCase().includes(unitText?.toLowerCase() || '') ||
        unit.short_name.toLowerCase() === unitText?.toLowerCase()
      )
      
      console.log(`Matched unit:`, matchedUnit)

      // Определяем основную цену в зависимости от типа строки
      const unitPrice = customer === 'раб' ? workPrice : 
                       customer === 'мат' ? materialPrice : 
                       workPrice || materialPrice || 0

      const convertedRecord = {
        materials: customer === 'мат' ? workName : (customer === 'Заказчик' ? workName : ''),
        works: customer === 'раб' ? workName : (customer === 'Заказчик' ? workName : ''),
        quantity: volume || 1,
        unit_id: matchedUnit?.id || '',
        unit_price: unitPrice,
        total_price: total || 0,
        notes: rowNumber ? `№ ${rowNumber}` : '',
        // Новые поля для расширенной структуры
        material_type: materialType,
        coefficient: coefficient || 1,
        work_price: workPrice,
        material_price: materialPrice,
        delivery_cost: delivery,
        record_type: customer === 'раб' ? 'work' : 
                     customer === 'мат' ? 'material' : 
                     (customer === 'Заказчик' || customer.includes('Заказчик') || customer.includes('заказчик') || customer.length > 5) ? 'summary' : 'work',
        // Дополнительные поля для UI
        customer: customer,
        work_name: workName,
        row_number: rowNumber,
      } as EstimateFormData
      
      console.log(`Converted row ${index}:`, {
        original: row,
        converted: convertedRecord,
        customer,
        workName,
        unitPrice,
        quantity: convertedRecord.quantity,
        unitId: convertedRecord.unit_id
      })
      
      return convertedRecord
    })
    
    // Фильтруем записи для тендерной сметы
    const validRecords = result.filter(record => {
      // Принимаем все типы записей: "Заказчик", "раб", "мат"
      console.log('Processing record:', record.customer, record.work_name)
      
      // Запись считается валидной если есть наименование работ 
      // Для строки "Заказчик" цена может быть 0
      const isValid = (record.work_name && record.work_name.trim()) &&
                     (record.customer === 'Заказчик' || record.unit_price > 0 || record.total_price > 0)
      
      if (!isValid) {
        console.log('Invalid record (no work name or price):', record)
      }
      
      return isValid
    })
    
    console.log('Conversion completed:', result.length, 'total,', validRecords.length, 'valid records')
    console.log('Sample converted record:', validRecords[0])
    
    if (validRecords.length === 0) {
      console.warn('No valid records found after conversion!')
      console.log('Raw data keys sample:', Object.keys(rawData[0] || {}))
    }
    
    return validRecords
  }

  const addImportedData = async (data: EstimateFormData[]) => {
    console.log('=== Starting database import ===')
    console.log('Data to import:', data.length, 'records')
    console.log('Sample record:', data[0])
    console.log('Selected project ID for import:', selectedProjectId)
    console.log('Available units:', units.length, 'units')
    console.log('Sample units:', units.slice(0, 3))

    if (!data || data.length === 0) {
      throw new Error('Нет данных для импорта')
    }

    if (!selectedProjectId) {
      throw new Error('Не выбран проект для импорта')
    }

    // Найдем единицу измерения по умолчанию
    const defaultUnit = units[0]
    if (!defaultUnit) {
      throw new Error('Нет доступных единиц измерения')
    }

    console.log('Default unit:', defaultUnit)

    // Конвертируем данные в формат API с поддержкой расширенной структуры
    const tenderEstimates = data.map((item, index) => {
      const record = {
        materials: item.materials || '',
        works: item.works || '',
        quantity: Number(item.quantity) || 1,
        unit_id: item.unit_id || defaultUnit.id,
        unit_price: Number(item.unit_price) || 0,
        total_price: Number(item.total_price) || 0,
        notes: item.notes || '',
        // Новые поля расширенной тендерной сметы
        material_type: item.material_type || null,
        coefficient: Number(item.coefficient) || 1,
        work_price: Number(item.work_price) || 0,
        material_price: Number(item.material_price) || 0,
        delivery_cost: Number(item.delivery_cost || item.delivery) || 0,
        record_type: (item.customer === 'раб' ? 'work' : 
                     item.customer === 'мат' ? 'material' : 
                     (item.customer === 'Заказчик' || item.customer?.includes('Заказчик') || item.customer?.includes('заказчик') || (item.customer && item.customer.length > 5)) ? 'summary' :
                     'work') as 'work' | 'material' | 'summary',
        project_id: selectedProjectId || null
      }
      
      if (index < 2) {
        console.log(`Record ${index} for API:`, {
          input: item,
          output: record,
          unitIdUsed: item.unit_id ? 'original' : 'default',
          recordType: record.record_type
        })
      }
      
      return record
    })

    console.log('Converted data for API:', tenderEstimates.length, 'records')
    console.log('First record for API:', tenderEstimates[0])

    try {
      // Используем обычный insert для добавления записей по одной
      let insertedCount = 0
      let errorCount = 0
      
      for (const estimate of tenderEstimates) {
        try {
          console.log('Inserting estimate:', estimate)
          await tenderEstimatesApi.create(estimate)
          insertedCount++
        } catch (insertError) {
          console.error('Failed to insert estimate:', insertError, estimate)
          errorCount++
        }
      }
      
      console.log(`Import completed: ${insertedCount} успешно, ${errorCount} ошибок`)
      
      if (errorCount > 0 && insertedCount === 0) {
        throw new Error(`Не удалось импортировать ни одной записи (${errorCount} ошибок)`)
      }
      
      if (errorCount > 0) {
        console.warn(`Импорт завершен с ошибками: ${errorCount} из ${insertedCount + errorCount}`)
      }
      
      console.log('=== Database import completed successfully ===')
    } catch (error) {
      console.error('Failed to import data to database:', error)
      throw error
    }
  }

  const processUrl = async (url: string) => {
    console.log('Processing URL:', url)

    try {
      console.log('Fetching data from URL...')
      const response = await fetch(url)
      console.log('Response status:', response.status, response.statusText)
      console.log('Response headers:', Array.from(response.headers.entries()))
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const contentType = response.headers.get('content-type')
      console.log('Content type:', contentType)
      
      let data
      let parsedData: any[] = []

      if (contentType?.includes('application/json')) {
        console.log('Processing as JSON')
        data = await response.json()
        console.log('JSON data received:', data)
        parsedData = Array.isArray(data) ? data : [data]
      } else if (contentType?.includes('text/csv')) {
        console.log('Processing as CSV (by content-type)')
        data = await response.text()
        console.log('Raw CSV data length:', data.length)
        console.log('Raw CSV data preview (first 500 chars):', data.substring(0, 500))
        parsedData = parseCSV(data)
      } else {
        console.log('Processing as text/other, trying to determine format')
        data = await response.text()
        console.log('Raw text data length:', data.length)
        console.log('Raw text data preview (first 500 chars):', data.substring(0, 500))
        
        if (!data || data.trim().length === 0) {
          throw new Error('Получены пустые данные с URL')
        }
        
        try {
          const jsonData = JSON.parse(data)
          console.log('Successfully parsed as JSON')
          parsedData = Array.isArray(jsonData) ? jsonData : [jsonData]
        } catch {
          console.log('JSON parse failed, processing as CSV')
          parsedData = parseCSV(data)
        }
      }

      console.log('Parsed data result:', parsedData.length, 'rows')
      console.log('URL content loaded and parsed:', parsedData.slice(0, 3))

      const convertedData = convertToEstimateData(parsedData)
      await addImportedData(convertedData)
    } catch (error) {
      console.error('processUrl error details:', error)
      throw new Error(`Ошибка загрузки данных по URL: ${error}`)
    }
  }

  const processGoogleSheets = async (url: string) => {
    console.log('Processing Google Sheets:', url)

    let csvUrl = url

    if (url.includes('docs.google.com/spreadsheets')) {
      // Извлекаем ID таблицы
      const sheetIdMatch = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/)
      if (!sheetIdMatch) {
        throw new Error('Неверный формат URL Google Sheets')
      }
      
      const sheetId = sheetIdMatch[1]
      
      // Извлекаем gid листа если есть
      const gidMatch = url.match(/[#&]gid=([0-9]+)/)
      const gid = gidMatch ? gidMatch[1] : '0'
      
      // Формируем URL для экспорта в CSV
      csvUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${gid}`
      
      console.log('Generated CSV URL:', csvUrl)
    }

    try {
      await processUrl(csvUrl)
    } catch (error) {
      console.error('Google Sheets processing error:', error)
      throw new Error(`Ошибка загрузки Google Таблицы: ${error}`)
    }
  }

  const handleDelete = (id: string) => {
    // Запрещаем удаление расчетных строк Заказчика
    const record = tableData.find(r => r.id === id)
    if (record?.isCalculated) {
      message.warning(
        'Строки заказчика рассчитываются автоматически и не подлежат удалению'
      )
      return
    }

    console.log('Delete row:', id)
    deleteMutation.mutate(id)
  }

  const isEditing = (record: any) => record.id === editingKey

  const getTotalSum = () => {
    return tableData.reduce((sum, item) => {
      const volume = item.quantity || item.volume || 0
      const workPrice = item.work_price || 0
      const materialPrice = item.material_price || 0
      const deliveryPrice = item.delivery_cost || 0
      const calculatedTotal =
        volume * (workPrice + materialPrice + deliveryPrice)
      return sum + calculatedTotal
    }, 0)
  }

  // Функция для определения цвета строки по значению заказчика
  const getRowClassName = (record: any) => {
    if (record.customer === 'Заказчик') return 'row-customer'
    if (record.customer === 'раб') return 'row-work'
    if (record.customer === 'мат') return 'row-material'
    return ''
  }

  // Функция для расчета итоговых строк Заказчика
  const calculateCustomerRows = (data: any[]) => {
    console.log(
      'calculateCustomerRows: входные данные',
      data.map(d => `${d.work_name} - ${d.customer}`)
    )

    // Группируем данные по work_name (наименование работ)
    const workGroups: Record<string, any[]> = {}

    data.forEach(item => {
      if (item.customer !== 'Заказчик') {
        const workName = item.work_name
        if (!workGroups[workName]) {
          workGroups[workName] = []
        }
        workGroups[workName].push(item)
      }
    })

    console.log('calculateCustomerRows: группы работ', workGroups)

    const customerRows: any[] = []

    // Для каждой группы работ создаем итоговую строку Заказчика
    Object.entries(workGroups).forEach(([workName, items]) => {
      const workRow = items.find(item => item.customer === 'раб')
      const materialRow = items.find(item => item.customer === 'мат')

      console.log(`calculateCustomerRows: для "${workName}" найдено:`, {
        workRow: workRow ? 'есть' : 'нет',
        materialRow: materialRow ? 'есть' : 'нет',
      })

      if (workRow || materialRow) {
        // Используем объем из строки "раб" как основной объем
        const baseVolume = workRow?.volume || materialRow?.volume || 1

        // Рассчитываем цены используя правильную формулу
        const workRowTotal = workRow
          ? (workRow.quantity || workRow.volume || 0) *
            ((workRow.work_price || 0) +
              (workRow.material_price || 0) +
              (workRow.delivery_cost || 0))
          : 0
        const materialRowTotal = materialRow
          ? (materialRow.quantity || materialRow.volume || 0) *
            ((materialRow.work_price || 0) +
              (materialRow.material_price || 0) +
              (materialRow.delivery_cost || 0))
          : 0

        const workPrice = workRow ? workRowTotal / baseVolume : 0
        const materialPrice = materialRow ? materialRowTotal / baseVolume : 0

        // Итоговая цена для заказчика (не используется в данном контексте)

        const customerRow = {
          id: `customer-${workName}`,
          project_id: workRow?.project_id || materialRow?.project_id,
          material_type_id:
            workRow?.material_type_id || materialRow?.material_type_id,
          material_type_name:
            workRow?.material_type_name || materialRow?.material_type_name,
          customer: 'Заказчик',
          work_name: workName,
          unit_id: workRow?.unit_id || materialRow?.unit_id,
          unit_short_name:
            workRow?.unit_short_name || materialRow?.unit_short_name,
          volume: baseVolume,
          material_consumption_ratio: 1.0,
          work_price: workPrice,
          material_price_with_vat: materialPrice,
          delivery_price: 0,
          isCalculated: true, // Флаг для идентификации расчетных строк
        }

        console.log(
          `calculateCustomerRows: создана строка заказчика для "${workName}":`,
          customerRow
        )
        customerRows.push(customerRow)
      }
    })

    console.log(
      'calculateCustomerRows: итого строк заказчика:',
      customerRows.length
    )
    return customerRows
  }

  // Подготавливаем данные для таблицы (включаем новую строку если редактируется)
  const tableData = React.useMemo(() => {
    // Обрабатываем все данные как есть из БД
    let allData = [...estimates]

    // Добавляем вычисляемые поля для UI
    allData = allData.map(item => ({
      ...item,
      customer: item.record_type === 'material' ? 'мат' :
                item.record_type === 'work' ? 'раб' :
                item.record_type === 'summary' ? 'Заказчик' :
                (item.materials ? 'мат' : item.works ? 'раб' : ''),
      work_name: item.materials || item.works || '',
    }))

    // Сортируем данные по типу: Заказчик → раб → мат
    const sortedData = allData.sort((a, b) => {
      // Сначала по названию работы
      const workNameA = a.work_name || ''
      const workNameB = b.work_name || ''
      if (workNameA !== workNameB) {
        return workNameA.localeCompare(workNameB)
      }
      
      // Затем по типу: Заказчик → раб → мат
      const orderMap = { 'Заказчик': 0, 'раб': 1, 'мат': 2 }
      const orderA = orderMap[a.customer as keyof typeof orderMap] ?? 999
      const orderB = orderMap[b.customer as keyof typeof orderMap] ?? 999
      return orderA - orderB
    })

    // Добавляем новую строку для редактирования если нужно
    if (newRowData && editingKey === 'new') {
      sortedData.unshift({ ...newRowData, id: 'new' } as any)
    }

    return sortedData
  }, [estimates, newRowData, editingKey])

  const columns = [
    {
      title: '№ п/п',
      dataIndex: 'row_number',
      key: 'row_number',
      width: 80,
      render: (value: string | null, record: any) => {
        // Определяем уровень вложенности по количеству точек
        const level = (value?.match(/\./g) || []).length
        const paddingLeft = level * 20
        
        return (
          <span style={{ paddingLeft, fontWeight: level === 0 ? 'bold' : 'normal' }}>
            {value || '—'}
          </span>
        )
      },
    },
    {
      title: 'Заказчик',
      dataIndex: 'customer',
      key: 'customer',
      width: 120,
      render: (value: string | null, record: any) => {
        const editing = isEditing(record)
        return editing ? (
          <Form.Item name="customer" style={{ margin: 0 }}>
            <Select
              size="small"
              placeholder="Выберите"
              allowClear
              showSearch
              options={[
                { label: 'Заказчик', value: 'Заказчик' },
                { label: 'раб', value: 'раб' },
                { label: 'мат', value: 'мат' },
              ]}
            />
          </Form.Item>
        ) : (
          value || '—'
        )
      },
    },
    {
      title: 'Тип материала',
      dataIndex: 'material_type_name',
      key: 'material_type_name',
      width: 150,
      render: (value: string | null, record: any) => {
        const editing = isEditing(record)
        return editing ? (
          <Form.Item
            name="material_type_id"
            style={{ margin: 0 }}
            rules={[{ required: true, message: 'Обязательно' }]}
          >
            <Select
              size="small"
              placeholder="Выберите тип"
              allowClear
              showSearch
              filterOption={(input, option) => {
                const type = materialTypes.find(t => t.id === option?.value)
                if (!type) return false
                return type.name.toLowerCase().includes(input.toLowerCase())
              }}
            >
              {materialTypes.map(type => (
                <Select.Option key={type.id} value={type.id}>
                  {type.name}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
        ) : (
          value || '—'
        )
      },
    },
    {
      title: 'Наименование работ',
      dataIndex: 'work_name',
      key: 'work_name',
      width: 200,
      render: (value: string, record: any) => {
        const editing = isEditing(record)
        return editing ? (
          <Form.Item
            name="work_name"
            style={{ margin: 0 }}
            rules={[{ required: true, message: 'Обязательно' }]}
          >
            <Input.TextArea
              size="small"
              rows={1}
              placeholder="Описание работ"
            />
          </Form.Item>
        ) : (
          <div style={{ wordBreak: 'break-word' }}>{value}</div>
        )
      },
    },
    {
      title: 'Ед.изм.',
      dataIndex: 'unit_short_name',
      key: 'unit_short_name',
      width: 80,
      align: 'center' as const,
      render: (value: string, record: any) => {
        const editing = isEditing(record)
        return editing ? (
          <Form.Item
            name="unit_id"
            style={{ margin: 0 }}
            rules={[{ required: true, message: 'Обязательно' }]}
          >
            <Select
              size="small"
              placeholder="Ед."
              allowClear
              showSearch
              filterOption={(input, option) => {
                const unit = units.find(u => u.id === option?.value)
                if (!unit) return false
                const searchText = input.toLowerCase()
                return (
                  unit.name.toLowerCase().includes(searchText) ||
                  unit.short_name.toLowerCase().includes(searchText)
                )
              }}
            >
              {units.map(unit => (
                <Select.Option key={unit.id} value={unit.id}>
                  {unit.short_name}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
        ) : (
          value
        )
      },
    },
    {
      title: 'Объем',
      dataIndex: 'volume',
      key: 'volume',
      width: 100,
      align: 'right' as const,
      render: (value: number, record: any) => {
        const editing = isEditing(record)
        return editing ? (
          <Form.Item
            name="volume"
            style={{ margin: 0 }}
            rules={[{ required: true, message: 'Обязательно' }]}
          >
            <InputNumber
              size="small"
              placeholder="0"
              precision={4}
              min={0}
              style={{ width: '100%' }}
            />
          </Form.Item>
        ) : (
          value?.toLocaleString('ru-RU', { maximumFractionDigits: 4 }) || '0'
        )
      },
    },
    {
      title: 'Коэф-т расхода',
      dataIndex: 'material_consumption_ratio',
      key: 'material_consumption_ratio',
      width: 120,
      align: 'right' as const,
      render: (value: number, record: any) => {
        const editing = isEditing(record)
        return editing ? (
          <Form.Item name="material_consumption_ratio" style={{ margin: 0 }}>
            <InputNumber
              size="small"
              placeholder="1.0"
              precision={6}
              min={0}
              defaultValue={1}
              style={{ width: '100%' }}
            />
          </Form.Item>
        ) : (
          value?.toLocaleString('ru-RU', { maximumFractionDigits: 6 }) || '1'
        )
      },
    },
    {
      title: 'Цена работы, руб.',
      dataIndex: 'work_price',
      key: 'work_price',
      width: 130,
      align: 'right' as const,
      render: (value: number, record: any) => {
        const editing = isEditing(record)
        return editing ? (
          <Form.Item name="work_price" style={{ margin: 0 }}>
            <InputNumber
              size="small"
              placeholder="0.00"
              precision={2}
              min={0}
              style={{ width: '100%' }}
              addonAfter="₽"
            />
          </Form.Item>
        ) : (
          formatCurrency(value)
        )
      },
    },
    {
      title: 'Цена материала с НДС, руб.',
      dataIndex: 'material_price_with_vat',
      key: 'material_price_with_vat',
      width: 150,
      align: 'right' as const,
      render: (value: number, record: any) => {
        const editing = isEditing(record)
        return editing ? (
          <Form.Item name="material_price_with_vat" style={{ margin: 0 }}>
            <InputNumber
              size="small"
              placeholder="0.00"
              precision={2}
              min={0}
              style={{ width: '100%' }}
              addonAfter="₽"
            />
          </Form.Item>
        ) : (
          formatCurrency(value)
        )
      },
    },
    {
      title: 'Доставка, руб.',
      dataIndex: 'delivery_cost',
      key: 'delivery_cost',
      width: 120,
      align: 'right' as const,
      render: (value: number, record: any) => {
        const editing = isEditing(record)
        return editing ? (
          <Form.Item name="delivery_cost" style={{ margin: 0 }}>
            <InputNumber
              size="small"
              placeholder="0.00"
              precision={2}
              min={0}
              style={{ width: '100%' }}
              addonAfter="₽"
            />
          </Form.Item>
        ) : (
          formatCurrency(value)
        )
      },
    },
    {
      title: 'Итого, руб.',
      dataIndex: 'total_price',
      key: 'total_price',
      width: 130,
      align: 'right' as const,
      render: (_: number, record: any) => {
        const editing = isEditing(record)

        // Рассчитываем итого по формуле: Объем × (Цена работы + Цена материала + Доставка)
        const volume = record.quantity || record.volume || 0
        const workPrice = record.work_price || 0
        const materialPrice = record.material_price || 0
        const deliveryPrice = record.delivery_cost || 0
        const calculatedTotal =
          volume * (workPrice + materialPrice + deliveryPrice)

        return editing ? (
          <div
            style={{
              background: '#f6ffed',
              border: '1px solid #b7eb8f',
              borderRadius: 4,
              padding: '4px 8px',
              textAlign: 'center',
              color: '#52c41a',
              fontSize: '12px',
            }}
          >
            {formatCurrency(calculatedTotal)}
          </div>
        ) : (
          <span style={{ fontWeight: 500, color: '#1677ff' }}>
            {formatCurrency(calculatedTotal)}
          </span>
        )
      },
    },
    {
      title: 'Действия',
      key: 'actions',
      width: 120,
      render: (_: unknown, record: any) => {
        const editing = isEditing(record)

        // Для расчетных строк Заказчика показываем только индикатор
        if (record.isCalculated) {
          return (
            <div
              style={{
                color: '#52c41a',
                fontSize: '12px',
                textAlign: 'center',
                fontStyle: 'italic',
              }}
            >
              авто
            </div>
          )
        }

        return editing ? (
          <Space size="small">
            <Button
              type="link"
              size="small"
              onClick={() => handleSave(record.id)}
              loading={
                record.id === 'new'
                  ? createMutation.isPending
                  : updateMutation.isPending
              }
              style={{ color: '#52c41a' }}
            >
              ✓
            </Button>
            <Button
              type="link"
              size="small"
              onClick={handleCancel}
              style={{ color: '#ff4d4f' }}
            >
              ✕
            </Button>
          </Space>
        ) : (
          <Space size="small">
            <Button
              type="link"
              size="small"
              onClick={() => handleEdit(record)}
              disabled={editingKey !== ''}
              style={{ color: '#1677ff' }}
            >
              ✎
            </Button>
            <Popconfirm
              title="Удалить?"
              onConfirm={() => handleDelete(record.id)}
              okText="Да"
              cancelText="Нет"
              disabled={editingKey !== ''}
            >
              <Button
                type="link"
                size="small"
                disabled={editingKey !== ''}
                style={{ color: '#ff4d4f' }}
              >
                ✕
              </Button>
            </Popconfirm>
          </Space>
        )
      },
    },
  ]

  return (
    <div
      style={{
        height: 'calc(100vh - 160px)',
        display: 'flex',
        flexDirection: 'column',
        background: '#f8fafc',
      }}
    >
      <style>
        {`
          .tender-estimate-page .ant-table-tbody > tr.row-customer > td {
            background: #ffffff !important;
            border-left: 3px solid #d9d9d9 !important;
            color: #000000 !important;
            font-weight: 500 !important;
          }
          .tender-estimate-page .ant-table-tbody > tr.row-work > td {
            background: #F8CBAD !important;
            border-left: 3px solid #D97B3A !important;
            color: #8B4513 !important;
          }
          .tender-estimate-page .ant-table-tbody > tr.row-material > td {
            background: #A4C2F4 !important;
            border-left: 3px solid #4A90E2 !important;
            color: #1E3A8A !important;
          }
          .tender-estimate-page .ant-table-tbody > tr.row-customer:hover > td {
            background: #f5f5f5 !important;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1) !important;
            transform: translateY(-1px) !important;
            transition: all 0.2s ease !important;
          }
          .tender-estimate-page .ant-table-tbody > tr.row-work:hover > td {
            background: #F3C299 !important;
            box-shadow: 0 2px 8px rgba(217, 123, 58, 0.2) !important;
            transform: translateY(-1px) !important;
            transition: all 0.2s ease !important;
          }
          .tender-estimate-page .ant-table-tbody > tr.row-material:hover > td {
            background: #8FB4F0 !important;
            box-shadow: 0 2px 8px rgba(74, 144, 226, 0.2) !important;
            transform: translateY(-1px) !important;
            transition: all 0.2s ease !important;
          }
          .tender-estimate-page .ant-table {
            border-radius: 12px !important;
            overflow: hidden !important;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08) !important;
          }
          .tender-estimate-page .ant-table-thead > tr > th {
            background: linear-gradient(135deg, #667eea, #764ba2) !important;
            color: #ffffff !important;
            font-weight: 600 !important;
            border: none !important;
            padding: 16px 12px !important;
            font-size: 13px !important;
          }
          .tender-estimate-page .ant-table-tbody > tr > td {
            padding: 12px !important;
            border-bottom: 1px solid #f0f0f0 !important;
            position: relative !important;
          }
        `}
      </style>
      <div style={{ 
        flexShrink: 0, 
        marginBottom: 24,
        background: '#ffffff',
        borderRadius: 16,
        padding: 24,
        boxShadow: '0 2px 12px rgba(0, 0, 0, 0.06)',
        border: '1px solid #f0f2f5'
      }}>
        <Row
          justify="space-between"
          align="middle"
          style={{ marginBottom: 24 }}
        >
          <Col>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{
                width: 48,
                height: 48,
                borderRadius: 12,
                background: 'linear-gradient(135deg, #667eea, #764ba2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 12px rgba(102, 126, 234, 0.3)'
              }}>
                <FileExcelOutlined style={{ color: '#fff', fontSize: 20 }} />
              </div>
              <div>
                <Title level={2} style={{ margin: 0, color: '#1a1a1a', fontSize: 28, fontWeight: 700 }}>
                  Тендерная смета
                </Title>
                <div style={{ color: '#64748b', fontSize: 14, marginTop: 4 }}>
                  Управление сметной документацией проекта
                </div>
              </div>
            </div>
          </Col>
          <Col>
            <Space size={12}>
              <div
                style={{
                  background: 'linear-gradient(135deg, #4ade80, #22c55e)',
                  borderRadius: 12,
                  padding: '12px 20px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  color: '#fff',
                  boxShadow: '0 4px 12px rgba(74, 222, 128, 0.3)',
                }}
              >
                <CalculatorOutlined style={{ fontSize: 16 }} />
                <div>
                  <div style={{ fontSize: 11, opacity: 0.9, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Итого</div>
                  <div style={{ fontWeight: 700, fontSize: 16 }}>
                    {formatCurrency(getTotalSum())}
                  </div>
                </div>
              </div>
              <Button
                type="primary"
                size="large"
                icon={<PlusOutlined />}
                onClick={handleAddNewRow}
                disabled={!selectedProjectId || editingKey !== ''}
                style={{
                  background: 'linear-gradient(135deg, #667eea, #764ba2)',
                  border: 'none',
                  borderRadius: 10,
                  height: 44,
                  fontWeight: 600,
                  boxShadow: '0 4px 12px rgba(102, 126, 234, 0.3)',
                }}
                title={
                  !selectedProjectId
                    ? 'Сначала выберите проект'
                    : editingKey !== ''
                      ? 'Завершите редактирование текущей записи'
                      : 'Добавить строку в таблицу'
                }
              >
                Добавить строку
              </Button>
              <Button
                size="large"
                icon={<UploadOutlined />}
                onClick={() => setImportModalVisible(true)}
                disabled={!selectedProjectId || editingKey !== ''}
                style={{
                  borderRadius: 10,
                  height: 44,
                  borderColor: '#667eea',
                  color: '#667eea',
                  fontWeight: 600,
                }}
                title={
                  !selectedProjectId
                    ? 'Сначала выберите проект'
                    : editingKey !== ''
                      ? 'Завершите редактирование текущей записи'
                      : 'Загрузить данные из файла или URL'
                }
              >
                Загрузить данные
              </Button>
            </Space>
          </Col>
        </Row>

        <Row style={{ marginBottom: 0 }}>
          <Col span={24}>
            <div style={{ 
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: 12,
              padding: 20,
              display: 'flex',
              alignItems: 'center',
              gap: 16
            }}>
              <div style={{
                width: 40,
                height: 40,
                borderRadius: 10,
                background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 12px rgba(245, 158, 11, 0.3)',
              }}>
                <ProjectOutlined style={{ color: '#fff', fontSize: 18 }} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: 16, color: '#374151', marginBottom: 8 }}>Выбор проекта</div>
                <Select
                  placeholder="Выберите проект для работы со сметой"
                  allowClear
                  showSearch
                  size="large"
                  style={{ minWidth: 350 }}
                  value={selectedProjectId}
                  onChange={handleProjectChange}
                  filterOption={(input, option) => {
                    const project = projects.find(p => p.id === option?.value)
                    if (!project) return false
                    return project.name
                      .toLowerCase()
                      .includes(input.toLowerCase())
                  }}
                >
                  {projects.map(project => (
                    <Select.Option key={project.id} value={project.id}>
                      {project.name}
                    </Select.Option>
                  ))}
                </Select>
              </div>
              {!selectedProjectId && (
                <div style={{
                  background: 'linear-gradient(135deg, #fbbf24, #f59e0b)',
                  color: '#fff',
                  borderRadius: 8,
                  padding: '8px 12px',
                  fontSize: 12,
                  fontWeight: 600,
                  whiteSpace: 'nowrap'
                }}>
                  Выберите проект
                </div>
              )}
            </div>
          </Col>
        </Row>
      </div>

      <div className="tender-estimate-page" style={{ 
        flex: 1, 
        overflow: 'hidden',
        background: '#ffffff',
        borderRadius: 16,
        padding: 24,
        boxShadow: '0 2px 12px rgba(0, 0, 0, 0.06)',
        border: '1px solid #f0f2f5'
      }}>
        {selectedProjectId ? (
          <Form form={form} component={false}>
            <Table
              columns={columns}
              dataSource={tableData}
              loading={estimatesLoading}
              rowKey="id"
              rowClassName={getRowClassName}
              pagination={{
                showSizeChanger: true,
                showQuickJumper: true,
                showTotal: (total, range) =>
                  `${range[0]}-${range[1]} из ${total} записей`,
                pageSizeOptions: ['10', '20', '50', '100'],
                defaultPageSize: 20,
              }}
              scroll={{
                x: 'max-content',
                y: 'calc(100vh - 300px)',
              }}
              sticky
              summary={() => (
                <Table.Summary>
                  <Table.Summary.Row>
                    <Table.Summary.Cell index={0} colSpan={9}>
                      <strong>Итого:</strong>
                    </Table.Summary.Cell>
                    <Table.Summary.Cell index={9} align="right">
                      <strong style={{ color: '#1677ff', fontSize: 16 }}>
                        {formatCurrency(getTotalSum())}
                      </strong>
                    </Table.Summary.Cell>
                    <Table.Summary.Cell index={10} />
                  </Table.Summary.Row>
                </Table.Summary>
              )}
            />
          </Form>
        ) : (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              height: '300px',
              color: '#8c8c8c',
              fontSize: '16px',
            }}
          >
            <ProjectOutlined
              style={{
                fontSize: '48px',
                marginBottom: '16px',
                color: '#d9d9d9',
              }}
            />
            <div>Выберите проект для просмотра и создания смет</div>
            <div style={{ fontSize: '14px', marginTop: '8px' }}>
              После выбора проекта вы сможете добавлять записи в смету
            </div>
          </div>
        )}
      </div>

      {/* Модальное окно для импорта данных */}
      <Modal
        title="Загрузка данных в смету"
        open={importModalVisible}
        onCancel={() => {
          setImportModalVisible(false)
          importForm.resetFields()
        }}
        width={600}
        footer={null}
      >
        <Form form={importForm} layout="vertical" onFinish={handleImportData}>
          <Form.Item
            name="sourceType"
            label="Источник данных"
            rules={[{ required: true, message: 'Выберите источник данных' }]}
            initialValue="file"
          >
            <Select>
              <Select.Option value="file">
                <Space>
                  <FileExcelOutlined />
                  Файл (Excel, CSV, JSON, TXT)
                </Space>
              </Select.Option>
              <Select.Option value="url">
                <Space>
                  <LinkOutlined />
                  URL ссылка
                </Space>
              </Select.Option>
              <Select.Option value="googleSheets">
                <Space>
                  <CloudOutlined />
                  Google Таблицы
                </Space>
              </Select.Option>
            </Select>
          </Form.Item>

          <Form.Item shouldUpdate>
            {({ getFieldValue }) => {
              const sourceType = getFieldValue('sourceType')

              if (sourceType === 'file') {
                return (
                  <Form.Item
                    name="file"
                    label="Выберите файл"
                    rules={[
                      { required: true, message: 'Выберите файл для загрузки' },
                    ]}
                  >
                    <Upload
                      accept=".xlsx,.xls,.csv,.json,.txt"
                      maxCount={1}
                      beforeUpload={() => false}
                    >
                      <Button icon={<UploadOutlined />}>Выбрать файл</Button>
                    </Upload>
                  </Form.Item>
                )
              }

              if (sourceType === 'url') {
                return (
                  <Form.Item
                    name="url"
                    label="URL ссылка"
                    rules={[
                      { required: true, message: 'Введите URL ссылку' },
                      { type: 'url', message: 'Введите корректную URL ссылку' },
                    ]}
                  >
                    <Input
                      placeholder="https://example.com/data.xlsx"
                      prefix={<LinkOutlined />}
                    />
                  </Form.Item>
                )
              }

              if (sourceType === 'googleSheets') {
                return (
                  <Form.Item
                    name="googleSheetsUrl"
                    label="Ссылка на Google Таблицу"
                    rules={[
                      {
                        required: true,
                        message: 'Введите ссылку на Google Таблицу',
                      },
                      { type: 'url', message: 'Введите корректную URL ссылку' },
                    ]}
                  >
                    <Input
                      placeholder="https://docs.google.com/spreadsheets/d/..."
                      prefix={<CloudOutlined />}
                    />
                  </Form.Item>
                )
              }

              return null
            }}
          </Form.Item>

          <Divider />

          <div style={{ marginBottom: 16 }}>
            <Typography.Text type="secondary">
              <strong>Поддерживаемые форматы:</strong>
            </Typography.Text>
            <ul style={{ marginTop: 8, paddingLeft: 20, color: '#8c8c8c' }}>
              <li>
                <strong>Excel:</strong> .xlsx, .xls (автоматический парсинг с поддержкой различных названий колонок)
              </li>
              <li>
                <strong>CSV:</strong> .csv (разделитель запятая или точка с
                запятой)
              </li>
              <li>
                <strong>JSON:</strong> .json (массив объектов)
              </li>
              <li>
                <strong>TXT:</strong> .txt (табулированные данные)
              </li>
              <li>
                <strong>Google Таблицы:</strong> публичные или доступные по
                ссылке
              </li>
              <li>
                <strong>URL:</strong> прямые ссылки на файлы
              </li>
            </ul>

            <div
              style={{
                marginTop: 12,
                padding: 8,
                background: '#f6ffed',
                border: '1px solid #b7eb8f',
                borderRadius: 4,
                fontSize: '12px',
                color: '#389e0d',
              }}
            >
              <strong>Поддерживаемые названия колонок:</strong><br/>
              • <strong>Заказчик/Тип:</strong> Заказчик, заказчик, тип, раб, мат, работы/материалы<br/>
              • <strong>Наименование:</strong> Наименование работ, наименование_работ, работы, наименование, материал, позиция<br/>
              • <strong>Единицы:</strong> Ед. изм., ед.изм., единица, measurement, ед<br/>
              • <strong>Объем:</strong> Объем, объем, количество, кол-во, qty, count<br/>
              • <strong>Расход материалов:</strong> Норм. расход мат-ов, коэффициент, коэф, расход<br/>
              • <strong>Цена работ:</strong> Цена работы, руб на ед., цена_работы, работа, стоимость работ, труд<br/>
              • <strong>Цена материалов:</strong> Цена мат-ов с НДС или без поставки, цена_материала, материал, стоимость материалов<br/>
              • <strong>Доставка:</strong> Поставка материалов, доставка, транспорт, логистика<br/>
              • <strong>Итого:</strong> Итого, итого, total, общая стоимость, сумма<br/>
            </div>

            <Typography.Text type="secondary">
              <strong>Ожидаемые заголовки столбцов:</strong>
            </Typography.Text>
            <div
              style={{
                marginTop: 8,
                padding: 12,
                background: '#f8f9fa',
                borderRadius: 4,
                fontSize: '12px',
              }}
            >
              <div>
                <strong>customer</strong> или <strong>заказчик</strong> - тип
                строки (раб, мат)
              </div>
              <div>
                <strong>work_name</strong> или{' '}
                <strong>наименование_работ</strong> - описание работ
              </div>
              <div>
                <strong>volume</strong> или <strong>объем</strong> - количество
              </div>
              <div>
                <strong>work_price</strong> или <strong>цена_работы</strong> -
                цена за работу
              </div>
              <div>
                <strong>material_price_with_vat</strong> или{' '}
                <strong>цена_материала</strong> - цена материала
              </div>
              <div>
                <strong>delivery_price</strong> или <strong>доставка</strong> -
                стоимость доставки
              </div>
            </div>
          </div>

          <Form.Item>
            <Space>
              <Button
                type="primary"
                htmlType="submit"
                loading={uploading}
                icon={<UploadOutlined />}
              >
                Загрузить данные
              </Button>
              <Button
                onClick={() => {
                  setImportModalVisible(false)
                  importForm.resetFields()
                }}
              >
                Отмена
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

export default TenderEstimate
