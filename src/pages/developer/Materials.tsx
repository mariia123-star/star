import { useState } from 'react'
import {
  Table,
  Button,
  Space,
  Typography,
  Modal,
  Form,
  Input,
  Select,
  Switch,
  message,
  Popconfirm,
  Tag,
  Row,
  Col,
  Card,
  InputNumber,
  Upload,
} from 'antd'
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  SearchOutlined,
  FileExcelOutlined,
  UploadOutlined,
  AppstoreOutlined,
  DownOutlined,
  RightOutlined,
  GoogleOutlined,
  LinkOutlined,
  ExportOutlined,
  BarChartOutlined,
} from '@ant-design/icons'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  materialsApi,
  MaterialUpdate,
  MaterialWithUnit,
  MaterialImportRow,
  MATERIAL_CATEGORY_OPTIONS,
} from '@/entities/materials'
import { unitsApi } from '@/entities/units'
import { ratesApi } from '@/entities/rates'
import { rateMaterialsApi } from '@/entities/rates/api/rate-materials-api'
import * as XLSX from 'xlsx'
import { generateMaterialCode } from '@/shared/utils/codeGenerator'
import { MaterialPriceAnalytics } from '@/widgets/materials'

const { Title } = Typography
const { Search } = Input

interface MaterialFormData {
  code: string
  name: string
  description?: string
  category: string
  rate_category?: string // Категория расценки для автоматической связи
  unit_id: string
  last_purchase_price?: number
  supplier?: string
  supplier_article?: string
  is_active: boolean
}

// Убираем дублирующий интерфейс - используем MaterialImportRow из types

function Materials() {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isImportModalOpen, setIsImportModalOpen] = useState(false)
  const [editingMaterial, setEditingMaterial] =
    useState<MaterialWithUnit | null>(null)
  const [form] = Form.useForm<MaterialFormData>()
  const [searchText, setSearchText] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<string>()
  const [importData, setImportData] = useState<MaterialImportRow[]>([])
  const [isImporting, setIsImporting] = useState(false)
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set()
  )
  const [googleSheetsModalVisible, setGoogleSheetsModalVisible] =
    useState(false)
  const [googleSheetsUrl, setGoogleSheetsUrl] = useState('')
  const [isAnalyzingSheet, setIsAnalyzingSheet] = useState(false)
  const [isAnalyticsModalOpen, setIsAnalyticsModalOpen] = useState(false)

  const queryClient = useQueryClient()

  const {
    data: materials = [],
    isLoading,
    error: materialsError,
  } = useQuery({
    queryKey: ['materials'],
    queryFn: materialsApi.getAll,
  })

  const { data: units = [], error: unitsError } = useQuery({
    queryKey: ['units'],
    queryFn: unitsApi.getAll,
  })

  const { data: rates = [] } = useQuery({
    queryKey: ['rates'],
    queryFn: ratesApi.getAll,
  })

  console.log('Materials page rendered', {
    action: 'page_render',
    timestamp: new Date().toISOString(),
    materialsCount: materials.length,
    unitsCount: units.length,
    isLoading,
    materialsError: materialsError?.message,
    unitsError: unitsError?.message,
  })

  // Детальное логирование данных
  if (materials.length > 0) {
    console.log('Materials data sample:', materials.slice(0, 2))
  }
  if (units.length > 0) {
    console.log('Units data sample:', units.slice(0, 2))
  }

  const createMutation = useMutation({
    mutationFn: materialsApi.create,
    onSuccess: async (data, variables) => {
      console.log('Material created successfully:', data)
      queryClient.invalidateQueries({ queryKey: ['materials'] })
      message.success('Материал успешно создан')

      // Автоматически связываем материал с расценками, если указана категория расценки
      if (variables.rate_category?.trim()) {
        await handleRateCategoryLink(variables, data.id)
      }

      handleCloseModal()
    },
    onError: error => {
      console.error('Create error details:', {
        error,
        message: error.message,
        timestamp: new Date().toISOString(),
      })
      message.error(`Ошибка при создании материала: ${error.message}`)
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: MaterialUpdate }) =>
      materialsApi.update(id, data),
    onSuccess: async (data, variables) => {
      console.log('Material updated successfully:', data)
      queryClient.invalidateQueries({ queryKey: ['materials'] })
      message.success('Материал успешно обновлен')

      // Автоматически связываем материал с расценками, если указана категория расценки
      if (variables.data.rate_category?.trim()) {
        // Преобразуем MaterialUpdate в MaterialFormData для совместимости
        const materialFormData: MaterialFormData = {
          code: variables.data.code || data.code,
          name: variables.data.name || data.name,
          description: variables.data.description,
          category: variables.data.category || data.category,
          rate_category: variables.data.rate_category,
          unit_id: variables.data.unit_id || data.unit_id,
          last_purchase_price: variables.data.last_purchase_price,
          supplier: variables.data.supplier,
          supplier_article: variables.data.supplier_article,
          is_active: variables.data.is_active ?? data.is_active,
        }
        await handleRateCategoryLink(materialFormData, variables.id)
      }

      handleCloseModal()
    },
    onError: error => {
      console.error('Update error details:', {
        error,
        message: error.message,
        timestamp: new Date().toISOString(),
      })
      message.error(`Ошибка при обновлении материала: ${error.message}`)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: materialsApi.delete,
    onSuccess: () => {
      console.log('Material deleted successfully')
      queryClient.invalidateQueries({ queryKey: ['materials'] })
      message.success('Материал успешно удален')
    },
    onError: error => {
      console.error('Delete error details:', {
        error,
        message: error.message,
        timestamp: new Date().toISOString(),
      })
      message.error(`Ошибка при удалении материала: ${error.message}`)
    },
  })

  const bulkImportMutation = useMutation({
    mutationFn: materialsApi.bulkImport,
    onSuccess: data => {
      console.log('Bulk import completed successfully:', data)
      queryClient.invalidateQueries({ queryKey: ['materials'] })
      message.success(`Успешно импортировано ${data.length} материалов`)
      handleCloseImportModal()
    },
    onError: error => {
      console.error('Bulk import error details:', {
        error,
        message: error.message,
        timestamp: new Date().toISOString(),
      })
      message.error(`Ошибка при импорте: ${error.message}`)
    },
  })

  // Функция автоматической связи материала с расценками по категории
  const handleRateCategoryLink = async (
    materialData: MaterialFormData,
    materialId: string
  ) => {
    // Проверяем, что rate_category заполнена
    if (!materialData.rate_category?.trim()) {
      console.log('Rate category not specified, skipping auto-link', {
        materialId,
        timestamp: new Date().toISOString(),
      })
      return
    }

    try {
      console.log('Starting rate category auto-link', {
        action: 'rate_category_auto_link_start',
        materialId,
        materialName: materialData.name,
        rateCategory: materialData.rate_category,
        timestamp: new Date().toISOString(),
      })

      // Находим все расценки, у которых subcategory совпадает с rate_category материала
      const matchingRates = rates.filter(
        rate =>
          rate.subcategory &&
          rate.subcategory.toLowerCase() ===
            materialData.rate_category!.toLowerCase()
      )

      console.log('Found matching rates:', {
        rateCategory: materialData.rate_category,
        matchingRatesCount: matchingRates.length,
        matchingRatesIds: matchingRates.map(r => ({
          id: r.id,
          code: r.code,
          name: r.name,
          subcategory: r.subcategory,
        })),
      })

      if (matchingRates.length === 0) {
        console.log('No matching rates found for category', {
          rateCategory: materialData.rate_category,
          timestamp: new Date().toISOString(),
        })
        message.info(
          `Расценки с подкатегорией "${materialData.rate_category}" не найдены. Материал создан без автосвязи.`
        )
        return
      }

      // Создаём связи для каждой найденной расценки
      const linkPromises = matchingRates.map(rate =>
        rateMaterialsApi.create({
          rate_id: rate.id,
          material_id: materialId,
          consumption: 1, // Значение по умолчанию
          unit_price: materialData.last_purchase_price || 0,
          notes: `Автоматически связано по категории "${materialData.rate_category}"`,
        })
      )

      await Promise.all(linkPromises)

      console.log('Rate category auto-link completed', {
        action: 'rate_category_auto_link_success',
        materialId,
        linkedRatesCount: matchingRates.length,
        timestamp: new Date().toISOString(),
      })

      message.success(
        `Материал "${materialData.name}" успешно связан с ${matchingRates.length} расценками`
      )

      // Обновляем кеш расценок, чтобы отобразить новые связи
      queryClient.invalidateQueries({ queryKey: ['rates'] })
    } catch (error) {
      console.error('Rate category auto-link error:', {
        error,
        materialId,
        rateCategory: materialData.rate_category,
        timestamp: new Date().toISOString(),
      })
      message.warning(
        `Материал создан, но не удалось автоматически связать с расценками: ${error}`
      )
    }
  }

  const toggleCategoryExpansion = (categoryValue: string) => {
    console.log('Toggle category expansion', {
      action: 'toggle_category_expansion',
      category: categoryValue,
      timestamp: new Date().toISOString(),
    })

    setExpandedCategories(prev => {
      const newSet = new Set(prev)
      if (newSet.has(categoryValue)) {
        newSet.delete(categoryValue)
      } else {
        newSet.add(categoryValue)
      }
      return newSet
    })
  }

  const handleAdd = () => {
    console.log('Add material clicked', {
      action: 'add_material',
      timestamp: new Date().toISOString(),
    })

    setEditingMaterial(null)
    form.resetFields()

    const defaultCategory = MATERIAL_CATEGORY_OPTIONS[0].value
    // Генерируем код автоматически
    const existingCodes = materials.map(m => m.code)
    const generatedCode = generateMaterialCode(defaultCategory, existingCodes)

    form.setFieldsValue({
      is_active: true,
      category: defaultCategory,
      code: generatedCode,
    })
    setIsModalOpen(true)
  }

  const handleAddToCategory = (categoryValue: string) => {
    console.log('Add material to category clicked', {
      action: 'add_material_to_category',
      category: categoryValue,
      timestamp: new Date().toISOString(),
    })

    setEditingMaterial(null)
    form.resetFields()

    // Генерируем код автоматически для выбранной категории
    const existingCodes = materials.map(m => m.code)
    const generatedCode = generateMaterialCode(categoryValue, existingCodes)

    form.setFieldsValue({
      is_active: true,
      category: categoryValue,
      code: generatedCode,
    })
    setIsModalOpen(true)
  }

  const handleEdit = (material: MaterialWithUnit) => {
    console.log('Edit material clicked', {
      action: 'edit_material',
      materialId: material.id,
      materialName: material.name,
      timestamp: new Date().toISOString(),
    })

    setEditingMaterial(material)
    form.setFieldsValue(material)
    setIsModalOpen(true)
  }

  const handleDelete = (id: string) => {
    console.log('Delete material clicked', {
      action: 'delete_material',
      materialId: id,
      timestamp: new Date().toISOString(),
    })

    deleteMutation.mutate(id)
  }

  const handleCloseModal = () => {
    console.log('Modal closed', {
      action: 'modal_close',
      timestamp: new Date().toISOString(),
    })

    setIsModalOpen(false)
    setEditingMaterial(null)
    form.resetFields()
  }

  const handleCloseImportModal = () => {
    console.log('Import modal closed', {
      action: 'import_modal_close',
      timestamp: new Date().toISOString(),
    })

    setIsImportModalOpen(false)
    setImportData([])
    setIsImporting(false)
  }

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields()

      console.log('Form submitted', {
        action: 'form_submit',
        values,
        editingMaterial: editingMaterial?.id,
        timestamp: new Date().toISOString(),
      })

      if (editingMaterial) {
        updateMutation.mutate({
          id: editingMaterial.id,
          data: values,
        })
      } else {
        createMutation.mutate(values)
      }
    } catch (error) {
      console.error('Form validation error:', error)
      message.error('Ошибка валидации формы')
    }
  }

  const handleSearch = (value: string) => {
    console.log('Search triggered', {
      action: 'search',
      searchText: value,
      timestamp: new Date().toISOString(),
    })
    setSearchText(value)
  }

  const handleCategoryFilter = (category: string) => {
    console.log('Category filter changed', {
      action: 'filter_category',
      category,
      timestamp: new Date().toISOString(),
    })
    setCategoryFilter(category)
  }

  const handleImportClick = () => {
    console.log('Import Excel clicked', {
      action: 'import_excel',
      timestamp: new Date().toISOString(),
    })
    setIsImportModalOpen(true)
  }

  // Функция сопоставления русского названия категории с кодом
  const getCategoryCodeByLabel = (label: string): string => {
    if (!label) return 'other'

    const normalizedLabel = label.toLowerCase().trim()

    // Поиск по точному совпадению label
    const exactMatch = MATERIAL_CATEGORY_OPTIONS.find(
      opt => opt.label.toLowerCase() === normalizedLabel
    )
    if (exactMatch) return exactMatch.value

    // Поиск по частичному совпадению (например, "бетон" найдет "Бетон и ЖБИ")
    const partialMatch = MATERIAL_CATEGORY_OPTIONS.find(opt =>
      opt.label.toLowerCase().includes(normalizedLabel)
    )
    if (partialMatch) return partialMatch.value

    // Поиск по коду (если уже передан код)
    const codeMatch = MATERIAL_CATEGORY_OPTIONS.find(
      opt => opt.value === normalizedLabel
    )
    if (codeMatch) return codeMatch.value

    console.warn(`Категория "${label}" не найдена, использована "other"`)
    return 'other'
  }

  // eslint-disable-next-line no-undef
  const handleFileUpload = (file: File): boolean => {
    console.log('File upload started', {
      action: 'file_upload_start',
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
      timestamp: new Date().toISOString(),
    })

    // Проверка типа файла
    const allowedTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
      'application/vnd.ms-excel', // .xls
    ]

    if (
      !allowedTypes.includes(file.type) &&
      !file.name.match(/\.(xlsx|xls)$/i)
    ) {
      console.error('Invalid file type:', {
        fileName: file.name,
        fileType: file.type,
        allowedTypes,
      })
      message.error(
        'Пожалуйста, выберите файл в формате Excel (.xlsx или .xls)'
      )
      return false
    }

    // Проверка размера файла (максимум 10MB)
    const maxFileSize = 10 * 1024 * 1024 // 10MB в байтах
    if (file.size > maxFileSize) {
      console.error('File too large:', {
        fileName: file.name,
        fileSize: file.size,
        maxFileSize,
      })
      message.error('Размер файла не должен превышать 10MB')
      return false
    }

    // eslint-disable-next-line no-undef
    const reader = new FileReader()

    reader.onerror = () => {
      console.error('FileReader error:', reader.error)
      message.error('Ошибка при чтении файла')
    }

    reader.onload = e => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer)
        const workbook = XLSX.read(data, { type: 'array' })
        const sheetName = workbook.SheetNames[0]
        const worksheet = workbook.Sheets[sheetName]
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 })

        // Парсинг данных Excel с улучшенной валидацией
        const parsedData: MaterialImportRow[] = []
        const errors: string[] = []

        console.log('Excel file structure:', {
          sheetName,
          totalRows: jsonData.length,
          firstRowData: jsonData[0],
          timestamp: new Date().toISOString(),
        })

        for (let i = 1; i < jsonData.length; i++) {
          const row = jsonData[i] as (string | number)[]

          // Пропускаем полностью пустые строки
          if (!row || row.length === 0 || row.every(cell => !cell)) {
            console.log(`Строка ${i + 1}: пустая строка, пропускается`)
            continue
          }

          try {
            // Детальное логирование каждой строки для отладки
            console.log(`Парсинг строки ${i + 1}:`, {
              row,
              code: row[0],
              name: row[1],
              unit: row[4],
            })

            // Преобразуем категорию из русского названия в код
            const categoryInput = String(row[3] || 'other').trim()
            const categoryCode = getCategoryCodeByLabel(categoryInput)

            const rowData: MaterialImportRow = {
              code: String(row[0] || '').trim(),
              name: String(row[1] || '').trim(),
              description: row[2] ? String(row[2]).trim() : undefined,
              category: categoryCode, // Используем преобразованный код
              unit_name: String(row[4] || '').trim(),
              last_purchase_price:
                typeof row[5] === 'number'
                  ? row[5]
                  : typeof row[5] === 'string' && !isNaN(Number(row[5]))
                    ? Number(row[5])
                    : undefined,
              supplier: row[6] ? String(row[6]).trim() : undefined,
              supplier_article: row[7] ? String(row[7]).trim() : undefined,
            }

            console.log(`Строка ${i + 1}: категория преобразована`, {
              input: categoryInput,
              output: categoryCode,
            })

            // Валидация обязательных полей с детальным логированием
            if (!rowData.code) {
              const errorMsg = `Строка ${i + 1}: отсутствует код материала (значение: '${row[0]}')`
              errors.push(errorMsg)
              console.warn(errorMsg)
              continue
            }
            if (!rowData.name) {
              const errorMsg = `Строка ${i + 1}: отсутствует наименование материала (значение: '${row[1]}')`
              errors.push(errorMsg)
              console.warn(errorMsg)
              continue
            }
            if (!rowData.unit_name) {
              const errorMsg = `Строка ${i + 1}: отсутствует единица измерения (значение: '${row[4]}')`
              errors.push(errorMsg)
              console.warn(errorMsg)
              continue
            }

            parsedData.push(rowData)
            console.log(`Строка ${i + 1}: успешно обработана`, rowData)
          } catch (error) {
            const errorMsg = `Строка ${i + 1}: ошибка парсинга - ${error}`
            errors.push(errorMsg)
            console.error(errorMsg, { row, error })
          }
        }

        // Показываем ошибки если есть
        if (errors.length > 0) {
          console.error('Excel parsing errors:', errors)

          // Выводим первые 10 ошибок для отладки
          const errorSample = errors.slice(0, 10).join('\n')
          console.error('First 10 errors:', errorSample)

          // Показываем детальное сообщение пользователю
          Modal.error({
            title: `Обнаружены ошибки в ${errors.length} строках`,
            content: (
              <div>
                <p>Проверьте следующие ошибки:</p>
                <ul style={{ maxHeight: '300px', overflow: 'auto' }}>
                  {errors.slice(0, 20).map((error, idx) => (
                    <li key={idx} style={{ fontSize: '12px', marginBottom: '4px' }}>
                      {error}
                    </li>
                  ))}
                  {errors.length > 20 && (
                    <li style={{ fontSize: '12px', color: '#999' }}>
                      ... и ещё {errors.length - 20} ошибок
                    </li>
                  )}
                </ul>
              </div>
            ),
            width: 600,
          })
        }

        setImportData(parsedData)
        console.log('Excel parsed successfully', {
          action: 'excel_parsed',
          rowCount: parsedData.length,
          errorCount: errors.length,
          timestamp: new Date().toISOString(),
        })

        if (parsedData.length > 0) {
          message.success(
            `Обработано ${parsedData.length} строк из Excel${errors.length > 0 ? ` (пропущено ${errors.length} строк с ошибками)` : ''}`
          )
        } else {
          message.error('Не удалось обработать ни одной строки. Проверьте формат файла.')
        }
      } catch (error) {
        console.error('Excel parsing error:', {
          error,
          fileName: file.name,
          errorMessage:
            error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString(),
        })

        let errorMessage = 'Ошибка при обработке Excel файла'
        if (error instanceof Error) {
          if (error.message.includes('Unsupported file')) {
            errorMessage =
              'Неподдерживаемый формат файла. Используйте .xlsx или .xls'
          } else if (error.message.includes('Invalid workbook')) {
            errorMessage = 'Файл поврежден или имеет неверный формат'
          } else {
            errorMessage = `Ошибка обработки: ${error.message}`
          }
        }

        message.error(errorMessage)
        setImportData([])
      }
    }
    reader.readAsArrayBuffer(file)
    return false // Предотвращаем автоматическую загрузку
  }

  const parseCsvData = async (csvText: string) => {
    try {
      const lines = csvText.split('\n').filter(line => line.trim())

      if (lines.length < 2) {
        throw new Error(
          'CSV файл должен содержать заголовок и хотя бы одну строку данных'
        )
      }

      const positions = []

      // Пропускаем заголовок (первую строку)
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim()
        if (!line) continue

        // Парсим CSV строку (разделение по запятой, учитываем кавычки)
        const cells = line.split(',').map(cell => {
          // Убираем кавычки в начале и конце
          return cell.trim().replace(/^"|"$/g, '')
        })

        if (cells.length >= 3) {
          const material = {
            name: cells[0] || '',
            unit: cells[1] || 'шт',
            category: cells[2] || 'other',
            price: cells[3] ? parseFloat(cells[3].replace(',', '.')) : 0,
          }

          // Проверяем что у нас есть хотя бы название
          if (material.name) {
            positions.push(material)
          }
        }
      }

      console.log('Parsed materials from CSV:', positions)

      return {
        success: true,
        positions,
        message: `Успешно обработано ${positions.length} материалов`,
      }
    } catch (error) {
      console.error('Error parsing CSV:', error)
      return {
        success: false,
        positions: [],
        message: error instanceof Error ? error.message : 'Ошибка парсинга CSV',
      }
    }
  }

  const handleGoogleSheetsImport = async () => {
    if (!googleSheetsUrl.trim()) {
      message.warning('Введите ссылку на Google Sheets')
      return
    }

    setIsAnalyzingSheet(true)
    try {
      console.log('Google Sheets import started', {
        action: 'google_sheets_import_start',
        url: googleSheetsUrl,
        timestamp: new Date().toISOString(),
      })

      // Преобразуем URL Google Sheets в CSV формат
      const csvUrl = googleSheetsUrl
        .replace('/edit#gid=', '/export?format=csv&gid=')
        .replace('/edit?gid=', '/export?format=csv&gid=')

      console.log('Fetching CSV from:', csvUrl)

      // Получаем данные из Google Sheets как CSV
      const response = await window.fetch(csvUrl)

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const csvText = await response.text()

      // Парсим CSV данные
      const data = await parseCsvData(csvText)

      console.log('Google Sheets import response', {
        success: data.success,
        materialsCount: data.positions?.length || 0,
        timestamp: new Date().toISOString(),
      })

      if (data.success && data.positions) {
        // Преобразуем данные из CSV в формат MaterialImportRow
        interface CsvMaterial {
          name: string
          unit: string
          category: string
          price: number
        }

        const importedMaterials: MaterialImportRow[] = data.positions.map(
          (material: CsvMaterial) => ({
            code: `GS-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            name: material.name || 'Импортированный материал',
            description: `Импортировано из Google Sheets`,
            category: material.category || 'other',
            unit_name: material.unit || 'шт',
            last_purchase_price: material.price || 0,
            supplier: 'Google Sheets Import',
            supplier_article: undefined,
          })
        )

        // Добавляем к существующим данным импорта
        setImportData(prev => [...prev, ...importedMaterials])

        message.success(
          `Успешно импортировано ${importedMaterials.length} материалов из Google Sheets`
        )
        setGoogleSheetsModalVisible(false)
        setGoogleSheetsUrl('')
      } else {
        // Проверяем специфичные ошибки
        let errorMessage = data.message || 'Ошибка импорта из Google Sheets'

        if (data.message && data.message.includes('Unauthorized')) {
          errorMessage =
            '❌ Таблица не опубликована. Откройте Google Sheets → Файл → Опубликовать в интернете'
        } else if (data.message && data.message.includes('Not Found')) {
          errorMessage = '❌ Таблица не найдена. Проверьте правильность ссылки'
        }

        message.error(errorMessage)
      }
    } catch (error) {
      console.error('Google Sheets import error:', error)
      message.error(`Ошибка соединения с сервером: ${error}`)
    } finally {
      setIsAnalyzingSheet(false)
    }
  }

  const handleImport = () => {
    console.log('Import started', {
      action: 'import_start',
      itemCount: importData.length,
      importDataSample: importData.slice(0, 3), // Первые 3 записи для отладки
      timestamp: new Date().toISOString(),
    })

    if (importData.length === 0) {
      console.error('Import attempted with empty data')
      message.error('Нет данных для импорта')
      return
    }

    // Валидация каждого элемента перед отправкой
    const invalidItems = importData.filter(
      item => !item.code || !item.name || !item.unit_name
    )

    if (invalidItems.length > 0) {
      console.error('Invalid items found:', invalidItems)
      message.error(
        `Обнаружены некорректные данные в ${invalidItems.length} записях. Проверьте код, название и единицу измерения.`
      )
      return
    }

    // Проверка на дубликаты кодов внутри импортируемых данных
    const importCodes = importData.map(item => item.code)
    const duplicateCodesInImport = importCodes.filter(
      (code, index) => importCodes.indexOf(code) !== index
    )

    if (duplicateCodesInImport.length > 0) {
      console.error('Duplicate codes found in import data:', duplicateCodesInImport)
      message.error(
        `Обнаружены дубликаты кодов в импортируемых данных: ${[...new Set(duplicateCodesInImport)].join(', ')}. Исправьте коды в Excel файле.`
      )
      return
    }

    // Проверка на конфликт с существующими материалами
    const existingCodes = materials.map(m => m.code)
    const conflictingCodes = importData
      .filter(item => existingCodes.includes(item.code))
      .map(item => item.code)

    if (conflictingCodes.length > 0) {
      console.warn('Conflicting codes with existing materials:', conflictingCodes)

      // Показываем модальное окно с выбором действия
      Modal.confirm({
        title: 'Обнаружены конфликты кодов',
        content: (
          <div>
            <p>
              Следующие коды уже существуют в базе данных ({conflictingCodes.length}{' '}
              шт.):
            </p>
            <ul style={{ maxHeight: '200px', overflow: 'auto' }}>
              {conflictingCodes.slice(0, 10).map((code, idx) => (
                <li key={idx}>{code}</li>
              ))}
              {conflictingCodes.length > 10 && (
                <li>... и ещё {conflictingCodes.length - 10} кодов</li>
              )}
            </ul>
            <p>
              <strong>Выберите действие:</strong>
            </p>
            <ul>
              <li>
                <strong>Пропустить дубликаты</strong> - импортировать только новые
                материалы
              </li>
              <li>
                <strong>Отмена</strong> - отменить импорт и исправить коды вручную
              </li>
            </ul>
          </div>
        ),
        okText: 'Пропустить дубликаты',
        cancelText: 'Отмена',
        onOk: () => {
          // Фильтруем импортируемые данные, убирая конфликтующие коды
          const filteredData = importData.filter(
            item => !existingCodes.includes(item.code)
          )

          console.log('Importing with duplicates filtered:', {
            originalCount: importData.length,
            filteredCount: filteredData.length,
            skippedCount: conflictingCodes.length,
            filteredDataSample: filteredData.slice(0, 3),
          })

          if (filteredData.length === 0) {
            message.warning('Все материалы уже существуют в базе данных')
            return
          }

          message.info(
            `Импортируется ${filteredData.length} новых материалов (пропущено ${conflictingCodes.length} дубликатов)`
          )

          setIsImporting(true)
          bulkImportMutation.mutate(filteredData)
        },
        onCancel: () => {
          console.log('Import cancelled by user due to conflicts')
          message.info('Импорт отменён')
        },
      })
      return
    }

    setIsImporting(true)
    bulkImportMutation.mutate(importData)
  }

  // Функция экспорта материалов в Excel
  const handleExportMaterials = () => {
    console.log('Export materials to Excel clicked', {
      action: 'export_materials_excel',
      materialsCount: materials.length,
      timestamp: new Date().toISOString(),
    })

    try {
      // Подготавливаем данные для экспорта с ПОЛНЫМ набором полей
      // ВАЖНО: Категория экспортируется КАК КОД (например: brick, metal), а не как название
      const exportData = materials.map(material => ({
        'Код': material.code,
        'Наименование': material.name,
        'Описание': material.description || '',
        'Категория': material.category, // Экспортируем КОД категории для обратного импорта
        'Единица измерения': material.unit_name || '',
        'Последняя цена': material.last_purchase_price || '',
        'Поставщик': material.supplier || '',
        'Артикул поставщика': material.supplier_article || '',
        'Активность': material.is_active ? 'Да' : 'Нет',
      }))

      // Создаём рабочую книгу Excel
      const worksheet = XLSX.utils.json_to_sheet(exportData)
      const workbook = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Материалы')

      // Генерируем имя файла с текущей датой
      const date = new Date().toISOString().split('T')[0]
      const filename = `Материалы_${date}.xlsx`

      // Сохраняем файл
      XLSX.writeFile(workbook, filename)

      message.success(`Экспортировано ${materials.length} материалов в файл ${filename}`)

      console.log('Materials export successful', {
        action: 'export_materials_success',
        materialsCount: materials.length,
        filename,
        timestamp: new Date().toISOString(),
      })
    } catch (error) {
      console.error('Export error:', error)
      message.error(`Ошибка при экспорте: ${error}`)
    }
  }

  const getCategoryConfig = (category: string) => {
    return (
      MATERIAL_CATEGORY_OPTIONS.find(option => option.value === category) ||
      MATERIAL_CATEGORY_OPTIONS[MATERIAL_CATEGORY_OPTIONS.length - 1]
    )
  }

  const filteredMaterials = materials.filter(material => {
    const matchesSearch =
      !searchText ||
      material.code.toLowerCase().includes(searchText.toLowerCase()) ||
      material.name.toLowerCase().includes(searchText.toLowerCase())

    const matchesCategory =
      !categoryFilter || material.category === categoryFilter

    return matchesSearch && matchesCategory
  })

  const columns = [
    {
      title: 'Код',
      dataIndex: 'code',
      key: 'code',
      width: 120,
      sorter: (a: MaterialWithUnit, b: MaterialWithUnit) =>
        a.code.localeCompare(b.code),
      ellipsis: true,
    },
    {
      title: 'Наименование',
      dataIndex: 'name',
      key: 'name',
      sorter: (a: MaterialWithUnit, b: MaterialWithUnit) =>
        a.name.localeCompare(b.name),
      ellipsis: true,
    },
    {
      title: 'Описание',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
      render: (description: string) => description || '-',
    },
    {
      title: 'Категория',
      dataIndex: 'category',
      key: 'category',
      width: 180,
      render: (category: string) => {
        const config = getCategoryConfig(category)
        return <Tag color={config.color}>{config.label}</Tag>
      },
      sorter: (a: MaterialWithUnit, b: MaterialWithUnit) =>
        a.category.localeCompare(b.category),
    },
    {
      title: 'Ед. изм.',
      dataIndex: 'unit_short_name',
      key: 'unit_short_name',
      width: 80,
      sorter: (a: MaterialWithUnit, b: MaterialWithUnit) =>
        a.unit_short_name.localeCompare(b.unit_short_name),
    },
    {
      title: 'Последняя цена',
      dataIndex: 'last_purchase_price',
      key: 'last_purchase_price',
      width: 120,
      render: (price: number) => (price ? `${price.toFixed(2)} ₽` : '-'),
      sorter: (a: MaterialWithUnit, b: MaterialWithUnit) =>
        (a.last_purchase_price || 0) - (b.last_purchase_price || 0),
    },
    {
      title: 'Поставщик',
      dataIndex: 'supplier',
      key: 'supplier',
      ellipsis: true,
      render: (supplier: string) => supplier || '-',
      sorter: (a: MaterialWithUnit, b: MaterialWithUnit) =>
        (a.supplier || '').localeCompare(b.supplier || ''),
    },
    {
      title: 'Артикул',
      dataIndex: 'supplier_article',
      key: 'supplier_article',
      width: 120,
      ellipsis: true,
      render: (article: string) => article || '-',
    },
    {
      title: 'Активность',
      dataIndex: 'is_active',
      key: 'is_active',
      width: 100,
      render: (isActive: boolean) => (
        <span
          style={{
            color: isActive ? '#52c41a' : '#ff4d4f',
            fontWeight: 500,
          }}
        >
          {isActive ? 'Активен' : 'Неактивен'}
        </span>
      ),
      sorter: (a: MaterialWithUnit, b: MaterialWithUnit) =>
        Number(a.is_active) - Number(b.is_active),
    },
    {
      title: 'Дата создания',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 140,
      render: (date: string) => new Date(date).toLocaleDateString('ru-RU'),
      sorter: (a: MaterialWithUnit, b: MaterialWithUnit) =>
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
    },
    {
      title: 'Действия',
      key: 'actions',
      width: 120,
      render: (_: unknown, record: MaterialWithUnit) => (
        <Space>
          <Button
            type="text"
            size="small"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
            title="Редактировать"
          />
          <Popconfirm
            title="Удалить материал?"
            description="Это действие нельзя отменить"
            onConfirm={() => handleDelete(record.id)}
            okText="Да"
            cancelText="Отмена"
          >
            <Button
              type="text"
              size="small"
              danger
              icon={<DeleteOutlined />}
              title="Удалить"
            />
          </Popconfirm>
        </Space>
      ),
    },
  ]

  return (
    <div className="modern-page-container materials-page">
      <div className="modern-page-header">
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 24,
          }}
        >
          <div className="modern-page-title">
            <div className="modern-page-icon rates">
              <AppstoreOutlined />
            </div>
            <div>
              <Title
                level={2}
                style={{
                  margin: 0,
                  color: '#1a1a1a',
                  fontSize: 28,
                  fontWeight: 700,
                }}
              >
                Сборник материалов
              </Title>
              <div style={{ color: '#64748b', fontSize: 14, marginTop: 4 }}>
                Каталог строительных материалов и их характеристики
              </div>
            </div>
          </div>
          <Space size={12}>
            <Button
              size="large"
              icon={<BarChartOutlined />}
              onClick={() => {
                console.log('Analytics button clicked', {
                  action: 'analytics_button_click',
                  timestamp: new Date().toISOString(),
                })
                setIsAnalyticsModalOpen(true)
              }}
              style={{
                borderRadius: 10,
                height: 44,
                borderColor: '#8b5cf6',
                color: '#8b5cf6',
                fontWeight: 600,
              }}
            >
              Аналитика цен
            </Button>
            <Button
              size="large"
              icon={<ExportOutlined />}
              onClick={handleExportMaterials}
              style={{
                borderRadius: 10,
                height: 44,
                borderColor: '#10b981',
                color: '#10b981',
                fontWeight: 600,
              }}
            >
              Экспорт в Excel
            </Button>
            <Button
              size="large"
              icon={<FileExcelOutlined />}
              onClick={handleImportClick}
              style={{
                borderRadius: 10,
                height: 44,
                borderColor: '#3b82f6',
                color: '#3b82f6',
                fontWeight: 600,
              }}
            >
              Импорт из Excel
            </Button>
            <Button
              size="large"
              icon={<GoogleOutlined />}
              onClick={() => setGoogleSheetsModalVisible(true)}
              style={{
                borderRadius: 10,
                height: 44,
                borderColor: '#4285f4',
                color: '#4285f4',
                fontWeight: 600,
              }}
            >
              Google Sheets
            </Button>
            <Button
              type="primary"
              size="large"
              className="modern-add-button rates"
              icon={<PlusOutlined />}
              onClick={handleAdd}
            >
              Добавить материал
            </Button>
          </Space>
        </div>

        <Card
          size="small"
          style={{
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: 12,
          }}
        >
          <Row gutter={[16, 16]}>
            <Col xs={24} sm={12} md={8} lg={6}>
              <Search
                placeholder="Поиск по коду или названию"
                allowClear
                onSearch={handleSearch}
                onChange={e => e.target.value === '' && setSearchText('')}
                prefix={<SearchOutlined />}
              />
            </Col>
            <Col xs={24} sm={12} md={8} lg={6}>
              <Select
                placeholder="Категория"
                allowClear
                showSearch
                value={categoryFilter}
                onChange={handleCategoryFilter}
                filterOption={(input, option) => {
                  const text =
                    (option?.children || option?.label)?.toString() || ''
                  return text.toLowerCase().includes(input.toLowerCase())
                }}
                style={{ width: '100%' }}
              >
                {MATERIAL_CATEGORY_OPTIONS.map(category => (
                  <Select.Option key={category.value} value={category.value}>
                    <Tag color={category.color}>{category.label}</Tag>
                  </Select.Option>
                ))}
              </Select>
            </Col>
          </Row>
        </Card>
      </div>

      <div className="modern-page-content">
        {materialsError && (
          <div style={{ padding: 16, textAlign: 'center', color: '#ff4d4f' }}>
            Ошибка загрузки материалов: {materialsError.message}
          </div>
        )}
        {unitsError && (
          <div style={{ padding: 16, textAlign: 'center', color: '#ff4d4f' }}>
            Ошибка загрузки единиц измерения: {unitsError.message}
          </div>
        )}
        <div className="materials-categories-container">
          {MATERIAL_CATEGORY_OPTIONS.map(category => {
            const categoryMaterials = filteredMaterials.filter(
              material => material.category === category.value
            )
            const isExpanded = expandedCategories.has(category.value)
            const hasMaterials = categoryMaterials.length > 0

            return (
              <div key={category.value} className="category-section">
                <Card
                  className="rates-card"
                  size="small"
                  style={{
                    marginBottom: 16,
                    background: isExpanded ? '#fafafa' : '#ffffff',
                    borderColor: category.color,
                    borderWidth: 2,
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      cursor: 'pointer',
                      padding: '8px 0',
                    }}
                    onClick={() => toggleCategoryExpansion(category.value)}
                  >
                    <div
                      style={{ display: 'flex', alignItems: 'center', gap: 12 }}
                    >
                      {isExpanded ? (
                        <DownOutlined style={{ color: category.color }} />
                      ) : (
                        <RightOutlined style={{ color: category.color }} />
                      )}
                      <Tag
                        color={category.color}
                        style={{ fontSize: 14, fontWeight: 600 }}
                      >
                        {category.label}
                      </Tag>
                      <span style={{ fontWeight: 500, color: '#595959' }}>
                        ({categoryMaterials.length} материалов)
                      </span>
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <Button
                        type="primary"
                        size="small"
                        icon={<PlusOutlined />}
                        onClick={e => {
                          e.stopPropagation()
                          handleAddToCategory(category.value)
                        }}
                        style={{
                          background: category.color,
                          borderColor: category.color,
                        }}
                      >
                        Добавить материал
                      </Button>
                    </div>
                  </div>

                  {isExpanded && hasMaterials && (
                    <div style={{ marginTop: 16 }}>
                      <Table
                        className="modern-table"
                        columns={columns}
                        dataSource={categoryMaterials}
                        loading={isLoading}
                        rowKey="id"
                        size="small"
                        pagination={{
                          showSizeChanger: true,
                          showQuickJumper: true,
                          showTotal: (total, range) =>
                            `${range[0]}-${range[1]} из ${total} записей`,
                          pageSizeOptions: ['5', '10', '20', '50'],
                          defaultPageSize: 10,
                          position: ['bottomRight'],
                        }}
                        scroll={{
                          x: 'max-content',
                        }}
                      />
                    </div>
                  )}

                  {isExpanded && !hasMaterials && (
                    <div
                      style={{
                        textAlign: 'center',
                        padding: '24px 0',
                        color: '#999',
                        marginTop: 16,
                        background: '#fafafa',
                        borderRadius: 8,
                      }}
                    >
                      В этой категории пока нет материалов
                    </div>
                  )}
                </Card>
              </div>
            )
          })}
        </div>
      </div>

      {/* Модальное окно редактирования/создания */}
      <Modal
        title={editingMaterial ? 'Редактировать материал' : 'Добавить материал'}
        open={isModalOpen}
        onOk={handleSubmit}
        onCancel={handleCloseModal}
        confirmLoading={createMutation.isPending || updateMutation.isPending}
        width={800}
      >
        <Form
          form={form}
          layout="vertical"
          initialValues={{
            is_active: true,
            category: MATERIAL_CATEGORY_OPTIONS[0].value,
          }}
        >
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="code"
                label="Код материала"
                rules={[
                  {
                    required: true,
                    message: 'Пожалуйста, введите код материала',
                  },
                  { max: 50, message: 'Максимальная длина 50 символов' },
                ]}
              >
                <Input placeholder="Например: МТ-001" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="unit_id"
                label="Единица измерения"
                rules={[
                  {
                    required: true,
                    message: 'Пожалуйста, выберите единицу измерения',
                  },
                ]}
              >
                <Select
                  placeholder="Выберите единицу измерения"
                  allowClear
                  showSearch
                  filterOption={(input, option) => {
                    const text =
                      (option?.children || option?.label)?.toString() || ''
                    return text.toLowerCase().includes(input.toLowerCase())
                  }}
                >
                  {units.map(unit => (
                    <Select.Option key={unit.id} value={unit.id}>
                      {unit.name} ({unit.short_name})
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="name"
            label="Наименование"
            rules={[
              { required: true, message: 'Пожалуйста, введите наименование' },
              { max: 500, message: 'Максимальная длина 500 символов' },
            ]}
          >
            <Input placeholder="Наименование материала" />
          </Form.Item>

          <Form.Item
            name="description"
            label="Описание"
            rules={[{ max: 1000, message: 'Максимальная длина 1000 символов' }]}
          >
            <Input.TextArea
              rows={3}
              placeholder="Подробное описание материала"
            />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="category"
                label="Категория"
                rules={[
                  { required: true, message: 'Пожалуйста, выберите категорию' },
                ]}
              >
                <Select
                  placeholder="Выберите категорию"
                  onChange={newCategory => {
                    // Регенерируем код при изменении категории (только для новых материалов)
                    if (!editingMaterial) {
                      const existingCodes = materials.map(m => m.code)
                      const generatedCode = generateMaterialCode(
                        newCategory,
                        existingCodes
                      )
                      form.setFieldsValue({ code: generatedCode })

                      console.log('Category changed, code regenerated:', {
                        action: 'category_change_code_regenerate',
                        newCategory,
                        generatedCode,
                        timestamp: new Date().toISOString(),
                      })
                    }
                  }}
                >
                  {MATERIAL_CATEGORY_OPTIONS.map(category => (
                    <Select.Option key={category.value} value={category.value}>
                      <Tag color={category.color}>{category.label}</Tag>
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="rate_category"
                label="Категория расценки"
                tooltip="При заполнении этого поля материал будет автоматически связан с расценками по подкатегории"
                rules={[
                  { max: 200, message: 'Максимальная длина 200 символов' },
                ]}
              >
                <Input placeholder="Например: кирпич, вяжущие, арматура" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="last_purchase_price"
                label="Последняя цена (₽)"
                rules={[
                  {
                    type: 'number',
                    min: 0,
                    message: 'Цена не может быть отрицательной',
                  },
                ]}
              >
                <InputNumber
                  style={{ width: '100%' }}
                  placeholder="0.00"
                  precision={2}
                  min={0}
                  step={0.01}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="supplier"
                label="Поставщик"
                rules={[
                  { max: 255, message: 'Максимальная длина 255 символов' },
                ]}
              >
                <Input placeholder="Поставщик (опционально)" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="supplier_article"
                label="Артикул поставщика"
                rules={[
                  { max: 100, message: 'Максимальная длина 100 символов' },
                ]}
              >
                <Input placeholder="Артикул (опционально)" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="is_active"
            label="Активность"
            valuePropName="checked"
          >
            <Switch checkedChildren="Активен" unCheckedChildren="Неактивен" />
          </Form.Item>
        </Form>
      </Modal>

      {/* Модальное окно импорта Excel */}
      <Modal
        title="Импорт материалов из Excel"
        open={isImportModalOpen}
        onCancel={() => {
          console.log('Import modal cancel clicked', {
            action: 'import_modal_cancel',
            importDataCount: importData.length,
            timestamp: new Date().toISOString(),
          })
          handleCloseImportModal()
        }}
        footer={[
          <Button key="cancel" onClick={handleCloseImportModal}>
            Отмена
          </Button>,
          <Button
            key="import"
            type="primary"
            loading={isImporting || bulkImportMutation.isPending}
            disabled={importData.length === 0}
            onClick={handleImport}
          >
            Импортировать ({importData.length})
          </Button>,
        ]}
        width={1000}
      >
        <div style={{ marginBottom: 16 }}>
          <Upload
            accept=".xlsx,.xls"
            beforeUpload={file => {
              console.log('Upload beforeUpload triggered', {
                fileName: file.name,
                fileType: file.type,
                fileSize: file.size,
                timestamp: new Date().toISOString(),
              })
              return handleFileUpload(file)
            }}
            showUploadList={false}
            multiple={false}
            maxCount={1}
          >
            <Button icon={<UploadOutlined />}>Выберите Excel файл</Button>
          </Upload>
          <div style={{ marginTop: 8, color: '#666', fontSize: '12px' }}>
            Формат: Код | Наименование | Описание | Категория | Единица
            измерения | Цена | Поставщик | Артикул
          </div>
        </div>

        {importData.length > 0 && (
          <Table
            size="small"
            dataSource={importData}
            rowKey={(record, index) => `${record.code}_${index}`}
            pagination={{ pageSize: 10 }}
            columns={[
              { title: 'Код', dataIndex: 'code', width: 100 },
              { title: 'Наименование', dataIndex: 'name', ellipsis: true },
              {
                title: 'Категория',
                dataIndex: 'category',
                width: 150,
                render: (category: string) => {
                  const config = getCategoryConfig(category)
                  return <Tag color={config.color}>{config.label}</Tag>
                },
              },
              { title: 'Ед. изм.', dataIndex: 'unit_name', width: 80 },
              {
                title: 'Цена',
                dataIndex: 'last_purchase_price',
                width: 100,
                render: (price: number) =>
                  price ? `${price.toFixed(2)} ₽` : '-',
              },
            ]}
          />
        )}
      </Modal>

      {/* Модальное окно для импорта из Google Sheets */}
      <Modal
        title={
          <span>
            <GoogleOutlined style={{ marginRight: 8, color: '#4285f4' }} />
            Импорт материалов из Google Sheets
          </span>
        }
        open={googleSheetsModalVisible}
        onCancel={() => {
          setGoogleSheetsModalVisible(false)
          setGoogleSheetsUrl('')
        }}
        width={800}
        footer={[
          <Button
            key="cancel"
            onClick={() => {
              setGoogleSheetsModalVisible(false)
              setGoogleSheetsUrl('')
            }}
          >
            Отмена
          </Button>,
          <Button
            key="import"
            type="primary"
            icon={<FileExcelOutlined />}
            loading={isAnalyzingSheet}
            onClick={handleGoogleSheetsImport}
            disabled={!googleSheetsUrl.trim()}
          >
            Импортировать материалы
          </Button>,
        ]}
      >
        <Space direction="vertical" style={{ width: '100%' }} size="large">
          <div>
            <h4>Инструкция по импорту материалов:</h4>
            <ol>
              <li>Откройте Google Sheets документ с данными о материалах</li>
              <li>Скопируйте полную ссылку из адресной строки браузера</li>
              <li>Вставьте ссылку в поле ниже</li>
              <li>Нажмите "Импортировать материалы"</li>
            </ol>
          </div>

          <Input
            size="large"
            placeholder="https://docs.google.com/spreadsheets/d/..."
            prefix={<LinkOutlined />}
            value={googleSheetsUrl}
            onChange={e => setGoogleSheetsUrl(e.target.value)}
          />

          <Card
            size="small"
            style={{ backgroundColor: '#fff7e6', borderColor: '#faad14' }}
          >
            <h4 style={{ color: '#fa8c16' }}>🔒 ВАЖНО! Настройка доступа:</h4>
            <p style={{ fontSize: '12px', marginBottom: 8, color: '#fa8c16' }}>
              <strong>Без публикации таблицы импорт не будет работать!</strong>
            </p>
            <ol style={{ marginBottom: 8, fontSize: '12px' }}>
              <li>
                <strong>Откройте Google Sheets с данными</strong>
              </li>
              <li>
                Нажмите <strong>"Файл" → "Опубликовать в интернете"</strong>
              </li>
              <li>
                Выберите <strong>"Весь документ"</strong> и формат{' '}
                <strong>"Веб-страница"</strong>
              </li>
              <li>
                Нажмите <strong>"Опубликовать"</strong> и подтвердите публикацию
              </li>
              <li>Скопируйте ссылку на таблицу из адресной строки браузера</li>
            </ol>
            <p style={{ fontSize: '11px', color: '#8c8c8c', marginBottom: 0 }}>
              💡 Если получаете ошибку "Unauthorized", значит таблица не
              опубликована
            </p>
          </Card>

          <Card size="small" style={{ backgroundColor: '#f5f5f5' }}>
            <h4>Ожидаемый формат данных:</h4>
            <ul style={{ marginBottom: 0, fontSize: '12px' }}>
              <li>
                <strong>Код материала</strong> - уникальный идентификатор
              </li>
              <li>
                <strong>Наименование</strong> - название материала
              </li>
              <li>
                <strong>Описание</strong> - подробное описание (опционально)
              </li>
              <li>
                <strong>Категория</strong> - тип материала (бетон, металл,
                кирпич и т.д.)
              </li>
              <li>
                <strong>Единица измерения</strong> - м, м², м³, кг, шт и т.д.
              </li>
              <li>
                <strong>Цена</strong> - стоимость за единицу
              </li>
              <li>
                <strong>Поставщик</strong> - название поставщика (опционально)
              </li>
              <li>
                <strong>Артикул</strong> - артикул поставщика (опционально)
              </li>
            </ul>
          </Card>

          <Card size="small" style={{ backgroundColor: '#e6f7ff' }}>
            <h4>Поддерживаемые категории материалов:</h4>
            <ul
              style={{
                marginBottom: 0,
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: '4px',
              }}
            >
              {MATERIAL_CATEGORY_OPTIONS.map(category => (
                <li key={category.value}>
                  <Tag color={category.color}>{category.label}</Tag>
                </li>
              ))}
            </ul>
          </Card>

          {isAnalyzingSheet && (
            <Card size="small" style={{ backgroundColor: '#fff7e6' }}>
              <h4>Процесс импорта:</h4>
              <ol style={{ marginBottom: 0 }}>
                <li>Подключение к документу...</li>
                <li>Анализ структуры таблицы...</li>
                <li>Извлечение данных о материалах...</li>
                <li>Преобразование в формат системы...</li>
                <li>Добавление в список импорта...</li>
              </ol>
            </Card>
          )}
        </Space>
      </Modal>

      {/* Модальное окно аналитики цен материалов */}
      <MaterialPriceAnalytics
        visible={isAnalyticsModalOpen}
        onClose={() => {
          console.log('Analytics modal closed', {
            action: 'analytics_modal_close',
            timestamp: new Date().toISOString(),
          })
          setIsAnalyticsModalOpen(false)
        }}
        materials={materials}
      />
    </div>
  )
}

export default Materials
