import { useState } from 'react'
import {
  Button,
  Upload,
  Table,
  App,
  Card,
  Typography,
  Space,
  Tag,
  Progress,
  Modal,
  Radio,
  Divider,
  Alert,
  Statistic,
  Row,
  Col,
  Input,
  Select,
} from 'antd'
import {
  UploadOutlined,
  FileExcelOutlined,
  CheckCircleOutlined,
  WarningOutlined,
  CloseCircleOutlined,
  InfoCircleOutlined,
  RocketOutlined,
  SendOutlined,
  SearchOutlined,
} from '@ant-design/icons'
import { useQuery } from '@tanstack/react-query'
import { ratesApi, rateMaterialsApi } from '@/entities/rates'
import { unitsApi } from '@/entities/units'
import { useNavigate } from 'react-router-dom'
import * as XLSX from 'xlsx'
import {
  findMatchingRates,
  getMatchQuality,
  formatMatchInfo,
  validateEstimateRow,
  type EstimateRow,
  type RateMatchResult,
  type Rate,
} from '@/shared/lib/rateMatching'

const { Title, Text, Paragraph } = Typography

interface ProcessedEstimateRow extends EstimateRow {
  id: string
  status:
    | 'pending'
    | 'exact_match'
    | 'good_match'
    | 'needs_review'
    | 'no_match'
    | 'validation_error'
  selectedRateId?: string
  selectedRateName?: string
  selectedRateCode?: string
  matches?: RateMatchResult[]
  matchScore?: number
  validationErrors?: string[]
  unit_id?: string // ID единицы измерения из справочника
  unit_short_name?: string // Сокращенное название единицы для отображения
}

function EstimateImport() {
  const navigate = useNavigate()
  const { message } = App.useApp()
  const [importData, setImportData] = useState<ProcessedEstimateRow[]>([])
  const [processing, setProcessing] = useState(false)
  const [processedCount, setProcessedCount] = useState(0)
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false)
  const [currentReviewItem, setCurrentReviewItem] =
    useState<ProcessedEstimateRow | null>(null)
  const [autoMatchThreshold, setAutoMatchThreshold] = useState(0.9)
  const [transferring, setTransferring] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedSubcategory, setSelectedSubcategory] = useState<string>('')

  // Загружаем все активные расценки
  const { data: rates = [], isLoading: ratesLoading } = useQuery({
    queryKey: ['rates'],
    queryFn: ratesApi.getAll,
  })

  // Загружаем справочник единиц измерения
  const { data: units = [], isLoading: unitsLoading } = useQuery({
    queryKey: ['units'],
    queryFn: unitsApi.getAll,
  })

  console.log('EstimateImport page rendered', {
    action: 'page_render',
    ratesCount: rates.length,
    importDataCount: importData.length,
    timestamp: new Date().toISOString(),
  })

  // Фильтруем только активные расценки
  const activeRates: Rate[] = rates.filter(r => r.is_active)

  // Получаем уникальные подкатегории
  const uniqueSubcategories = Array.from(
    new Set(activeRates.map(r => r.subcategory).filter(Boolean))
  ).sort()

  const handleFileUpload = (file: File): boolean => { // eslint-disable-line no-undef
    console.log('Excel file upload started', {
      action: 'estimate_import_file_upload',
      fileName: file.name,
      fileSize: file.size,
      timestamp: new Date().toISOString(),
    })

    const reader = new FileReader() // eslint-disable-line no-undef

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

        console.log('Excel file parsed', {
          sheetName,
          totalRows: jsonData.length,
          timestamp: new Date().toISOString(),
        })

        // Парсинг данных Excel
        const parsedData: ProcessedEstimateRow[] = []

        // Пропускаем заголовок (первая строка)
        for (let i = 1; i < jsonData.length; i++) {
          const row = jsonData[i] as (string | number)[]

          // Пропускаем пустые строки
          if (!row || row.length === 0 || row.every(cell => !cell)) {
            continue
          }

          try {
            const unitText = String(row[1] || '').trim()

            // Находим соответствующую единицу измерения из справочника
            const matchedUnit = units.find(u =>
              u.name.toLowerCase() === unitText.toLowerCase() ||
              u.short_name.toLowerCase() === unitText.toLowerCase()
            )

            const estimateRow: ProcessedEstimateRow = {
              id: `row-${i}`,
              workName: String(row[0] || '').trim(),
              unit: matchedUnit ? matchedUnit.short_name : unitText, // Используем short_name из справочника
              volume: typeof row[2] === 'number' ? row[2] : parseFloat(String(row[2] || 0)),
              subcategory: row[3] ? String(row[3]).trim() : undefined,
              category: row[4] ? String(row[4]).trim() : undefined,
              description: row[5] ? String(row[5]).trim() : undefined,
              status: 'pending',
              unit_id: matchedUnit?.id, // Сохраняем ID из справочника
              unit_short_name: matchedUnit?.short_name || unitText, // Сохраняем сокращенное название
            }

            // Валидация обязательных полей с новыми правилами
            const validation = validateEstimateRow(estimateRow)

            if (!validation.isValid) {
              console.warn(`Строка ${i + 1}: ошибки валидации`, validation.errors)
              // Добавляем строку с ошибками валидации
              parsedData.push({
                ...estimateRow,
                status: 'validation_error',
                validationErrors: validation.errors,
              })
              continue
            }

            parsedData.push(estimateRow)
          } catch (error) {
            console.error(`Ошибка парсинга строки ${i + 1}:`, error)
          }
        }

        if (parsedData.length === 0) {
          message.error('Не удалось обработать ни одной строки. Проверьте формат файла.')
          return
        }

        setImportData(parsedData)
        message.success(`Загружено ${parsedData.length} позиций из Excel`)

        console.log('Excel import successful', {
          action: 'estimate_import_success',
          rowCount: parsedData.length,
          timestamp: new Date().toISOString(),
        })
      } catch (error) {
        console.error('Excel parsing error:', error)
        message.error('Ошибка при обработке Excel файла')
      }
    }

    reader.readAsArrayBuffer(file)
    return false
  }

  const handleAutoMatch = async () => {
    if (activeRates.length === 0) {
      message.error('Сборник расценок пуст. Добавьте расценки перед импортом.')
      return
    }

    setProcessing(true)
    setProcessedCount(0)

    console.log('Auto-matching started', {
      action: 'estimate_auto_match_start',
      itemsCount: importData.length,
      ratesCount: activeRates.length,
      threshold: autoMatchThreshold,
      timestamp: new Date().toISOString(),
    })

    const processedData: ProcessedEstimateRow[] = []

    for (let i = 0; i < importData.length; i++) {
      const item = importData[i]

      // Имитация асинхронности для отображения прогресса
      await new Promise(resolve => setTimeout(resolve, 10)) // eslint-disable-line no-undef

      // Пропускаем строки с ошибками валидации
      if (item.status === 'validation_error') {
        processedData.push(item)
        setProcessedCount(i + 1)
        continue
      }

      // Поиск подходящих расценок (минимум 50% совпадение по наименованию)
      const matches = findMatchingRates(item, activeRates, 0.5)

      let status: ProcessedEstimateRow['status'] = 'no_match'
      let selectedRateId: string | undefined
      let selectedRateName: string | undefined
      let selectedRateCode: string | undefined
      let matchScore: number | undefined

      if (matches.length > 0) {
        const bestMatch = matches[0]
        const quality = getMatchQuality(bestMatch)

        // Автоматически выбираем расценку если score выше порога
        if (bestMatch.score >= autoMatchThreshold) {
          status = quality === 'exact' ? 'exact_match' : 'good_match'
          selectedRateId = bestMatch.rateId
          selectedRateName = bestMatch.rateName
          selectedRateCode = bestMatch.rateCode
          matchScore = bestMatch.score
        } else {
          status = 'needs_review'
        }
      }

      processedData.push({
        ...item,
        status,
        selectedRateId,
        selectedRateName,
        selectedRateCode,
        matches,
        matchScore,
      })

      setProcessedCount(i + 1)
    }

    setImportData(processedData)
    setProcessing(false)

    const stats = {
      exactMatch: processedData.filter(i => i.status === 'exact_match').length,
      goodMatch: processedData.filter(i => i.status === 'good_match').length,
      needsReview: processedData.filter(i => i.status === 'needs_review').length,
      noMatch: processedData.filter(i => i.status === 'no_match').length,
    }

    console.log('Auto-matching completed', {
      action: 'estimate_auto_match_complete',
      stats,
      timestamp: new Date().toISOString(),
    })

    message.success(
      `Обработка завершена! Точных совпадений: ${stats.exactMatch}, Хороших: ${stats.goodMatch}, Требует проверки: ${stats.needsReview}, Без совпадений: ${stats.noMatch}`
    )
  }

  const handleReviewItem = (item: ProcessedEstimateRow) => {
    console.log('Review item clicked', {
      action: 'review_item',
      itemId: item.id,
      workName: item.workName,
      timestamp: new Date().toISOString(),
    })

    // Сбросить поиск при открытии нового модального окна
    setSearchTerm('')
    setSelectedSubcategory('')
    setCurrentReviewItem(item)
    setIsReviewModalOpen(true)
  }

  // Фильтруем расценки для ручного выбора
  const getFilteredRatesForManualSelection = () => {
    if (!currentReviewItem) return []

    let filteredRates = [...activeRates]

    // Фильтр по подкатегории
    if (selectedSubcategory) {
      filteredRates = filteredRates.filter(
        r => r.subcategory === selectedSubcategory
      )
    }

    // Фильтр по поисковому запросу
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase()
      filteredRates = filteredRates.filter(
        r =>
          r.name.toLowerCase().includes(searchLower) ||
          r.code.toLowerCase().includes(searchLower) ||
          r.description?.toLowerCase().includes(searchLower)
      )
    }

    // Если есть найденные совпадения, показываем их в начале
    if (currentReviewItem.matches && currentReviewItem.matches.length > 0) {
      const matchedRateIds = new Set(
        currentReviewItem.matches.map(m => m.rateId)
      )
      const matchedRates = filteredRates.filter(r => matchedRateIds.has(r.id))
      const otherRates = filteredRates.filter(r => !matchedRateIds.has(r.id))
      return [...matchedRates, ...otherRates]
    }

    return filteredRates
  }

  const handleSelectRate = (rateId: string) => {
    if (!currentReviewItem) return

    // Находим выбранную расценку в списке всех расценок
    const selectedRate = activeRates.find(r => r.id === rateId)

    if (!selectedRate) {
      console.error('Rate not found', { rateId })
      message.error('Расценка не найдена')
      return
    }

    // Пытаемся найти score из автоматических совпадений (если есть)
    const selectedMatch = currentReviewItem.matches?.find(m => m.rateId === rateId)
    const matchScore = selectedMatch?.score || 0.5 // Для ручного выбора используем базовый score

    console.log('Rate selected', {
      action: 'rate_selected',
      itemId: currentReviewItem.id,
      rateId,
      rateName: selectedRate.name,
      isFromAutoMatch: !!selectedMatch,
      timestamp: new Date().toISOString(),
    })

    const updatedData = importData.map(item =>
      item.id === currentReviewItem.id
        ? {
            ...item,
            status: 'good_match' as const,
            selectedRateId: selectedRate.id,
            selectedRateName: selectedRate.name,
            selectedRateCode: selectedRate.code,
            matchScore: matchScore,
          }
        : item
    )

    setImportData(updatedData)
    setIsReviewModalOpen(false)
    setCurrentReviewItem(null)
    message.success('Расценка выбрана')
  }

  const handleSkipItem = () => {
    if (!currentReviewItem) return

    console.log('Item skipped', {
      action: 'item_skipped',
      itemId: currentReviewItem.id,
      timestamp: new Date().toISOString(),
    })

    const updatedData = importData.map(item =>
      item.id === currentReviewItem.id
        ? { ...item, status: 'no_match' as const }
        : item
    )

    setImportData(updatedData)
    setIsReviewModalOpen(false)
    setCurrentReviewItem(null)
  }

  const handleTransferToCalculator = async () => {
    console.log('🚀 Transfer to calculator started', {
      action: 'transfer_to_calculator',
      totalImportData: importData.length,
      importDataSample: importData.slice(0, 2),
      timestamp: new Date().toISOString(),
    })

    setTransferring(true)

    try {
      // Фильтруем только успешно подобранные позиции
      const matchedItems = importData.filter(
        item =>
          item.selectedRateId &&
          (item.status === 'exact_match' || item.status === 'good_match')
      )

      console.log('✅ Matched items filtered', {
        totalItems: importData.length,
        matchedCount: matchedItems.length,
        matchedItems: matchedItems.map(i => ({
          id: i.id,
          workName: i.workName,
          status: i.status,
          selectedRateId: i.selectedRateId,
          volume: i.volume,
        })),
      })

      if (matchedItems.length === 0) {
        console.error('❌ No matched items found!', {
          importData: importData.map(i => ({
            id: i.id,
            workName: i.workName,
            status: i.status,
            hasRateId: !!i.selectedRateId,
          })),
        })
        message.warning('Нет подобранных расценок для переноса')
        setTransferring(false)
        return
      }

      console.log('📦 Items to transfer', {
        count: matchedItems.length,
        items: matchedItems.map(i => ({
          workName: i.workName,
          rateId: i.selectedRateId,
          volume: i.volume,
        })),
      })

      // Загружаем материалы для каждой расценки
      const ratesWithMaterials = await Promise.all(
        matchedItems.map(async item => {
          try {
            const rateId = item.selectedRateId!
            const rate = rates.find(r => r.id === rateId)

            if (!rate) {
              console.warn('Rate not found', { rateId })
              return null
            }

            // Загружаем материалы расценки
            const rateMaterials = await rateMaterialsApi.getByRateId(rateId)

            console.log('Rate materials loaded', {
              rateId,
              rateName: rate.name,
              materialsCount: rateMaterials.length,
            })

            return {
              estimateItem: item,
              rate: rate,
              materials: rateMaterials,
            }
          } catch (error) {
            console.error('Error loading rate materials', {
              rateId: item.selectedRateId,
              error,
            })
            return null
          }
        })
      )

      // Фильтруем null значения
      const validRatesWithMaterials = ratesWithMaterials.filter(
        item => item !== null
      )

      console.log('Transfer data prepared', {
        totalItems: validRatesWithMaterials.length,
        timestamp: new Date().toISOString(),
      })

      // Переходим в калькулятор с данными
      navigate('/documents/calculator', {
        state: {
          importedRates: validRatesWithMaterials,
          source: 'estimate-import',
        },
      })

      message.success(`Перенесено ${validRatesWithMaterials.length} расценок в калькулятор`)
    } catch (error) {
      console.error('Transfer to calculator failed', error)
      message.error('Ошибка при переносе расценок в калькулятор')
    } finally {
      setTransferring(false)
    }
  }

  const getStatusTag = (status: ProcessedEstimateRow['status']) => {
    switch (status) {
      case 'exact_match':
        return <Tag icon={<CheckCircleOutlined />} color="success">Точное совпадение</Tag>
      case 'good_match':
        return <Tag icon={<CheckCircleOutlined />} color="processing">Подобрана</Tag>
      case 'needs_review':
        return <Tag icon={<WarningOutlined />} color="warning">Требует проверки</Tag>
      case 'no_match':
        return <Tag icon={<CloseCircleOutlined />} color="default">Без совпадений</Tag>
      case 'validation_error':
        return <Tag icon={<CloseCircleOutlined />} color="error">Ошибка валидации</Tag>
      default:
        return <Tag icon={<InfoCircleOutlined />} color="default">Ожидает</Tag>
    }
  }

  const columns = [
    {
      title: '№',
      dataIndex: 'id',
      key: 'id',
      width: 60,
      render: (_: unknown, __: unknown, index: number) => index + 1,
    },
    {
      title: 'Наименование работ',
      dataIndex: 'workName',
      key: 'workName',
      ellipsis: true,
    },
    {
      title: 'Ед.изм.',
      dataIndex: 'unit_short_name',
      key: 'unit',
      width: 80,
      render: (_: unknown, record: ProcessedEstimateRow) => {
        // Отображаем сокращенное название из справочника
        return record.unit_short_name || record.unit
      },
    },
    {
      title: 'Объем',
      dataIndex: 'volume',
      key: 'volume',
      width: 100,
      render: (volume: number) => volume.toFixed(2),
    },
    {
      title: 'Подкатегория',
      dataIndex: 'subcategory',
      key: 'subcategory',
      width: 150,
      ellipsis: true,
      render: (sub: string) => sub || '-',
    },
    {
      title: 'Статус',
      dataIndex: 'status',
      key: 'status',
      width: 180,
      render: (status: ProcessedEstimateRow['status']) => getStatusTag(status),
    },
    {
      title: 'Расценка',
      key: 'rate',
      ellipsis: true,
      render: (_: unknown, record: ProcessedEstimateRow) => {
        // Показываем ошибки валидации
        if (record.status === 'validation_error' && record.validationErrors) {
          return (
            <div>
              {record.validationErrors.map((error, idx) => (
                <div key={idx} style={{ color: '#ff4d4f', fontSize: 12 }}>
                  ⚠️ {error}
                </div>
              ))}
            </div>
          )
        }

        if (record.selectedRateName) {
          return (
            <div>
              <div>{record.selectedRateName}</div>
              <Text type="secondary" style={{ fontSize: 12 }}>
                {record.selectedRateCode} | Совпадение: {((record.matchScore || 0) * 100).toFixed(1)}%
              </Text>
            </div>
          )
        }
        return '-'
      },
    },
    {
      title: 'Действия',
      key: 'actions',
      width: 120,
      render: (_: unknown, record: ProcessedEstimateRow) => {
        if (record.status === 'needs_review' || record.status === 'no_match') {
          return (
            <Button
              size="small"
              type="link"
              onClick={() => handleReviewItem(record)}
              icon={<SearchOutlined />}
            >
              Выбрать
            </Button>
          )
        }
        if (record.status === 'exact_match' || record.status === 'good_match') {
          return (
            <Button
              size="small"
              type="link"
              onClick={() => handleReviewItem(record)}
              style={{ color: '#52c41a' }}
            >
              Изменить
            </Button>
          )
        }
        return null
      },
    },
  ]

  const stats = {
    total: importData.length,
    exactMatch: importData.filter(i => i.status === 'exact_match').length,
    goodMatch: importData.filter(i => i.status === 'good_match').length,
    needsReview: importData.filter(i => i.status === 'needs_review').length,
    noMatch: importData.filter(i => i.status === 'no_match').length,
  }

  const successRate = stats.total > 0
    ? ((stats.exactMatch + stats.goodMatch) / stats.total) * 100
    : 0

  return (
    <div className="modern-page-container">
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
            <div className="modern-page-icon">
              <RocketOutlined />
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
                Импорт сметы из Excel
              </Title>
              <div style={{ color: '#64748b', fontSize: 14, marginTop: 4 }}>
                Автоматический подбор расценок с учётом подкатегорий
              </div>
            </div>
          </div>
        </div>

        <Alert
          message="Инструкция по использованию"
          description={
            <div>
              <Paragraph style={{ marginBottom: 8 }}>
                <strong>Формат Excel файла:</strong>
              </Paragraph>
              <ul style={{ marginBottom: 8 }}>
                <li>Столбец 1: <strong>Наименование работ</strong> (обязательно)</li>
                <li>Столбец 2: <strong>Ед.изм.</strong> (обязательно)</li>
                <li>Столбец 3: <strong>Объем</strong> (обязательно)</li>
                <li>Столбец 4: <strong>Подкатегория</strong> (❗ ОБЯЗАТЕЛЬНО)</li>
                <li>Столбец 5: <strong>Категория</strong> (опционально)</li>
                <li>Столбец 6: <strong>Описание</strong> (опционально)</li>
              </ul>
              <Alert
                message="Новые правила сопоставления"
                description={
                  <div>
                    <div>✓ <strong>Подкатегория</strong> - ОБЯЗАТЕЛЬНА, должна совпадать на 100%</div>
                    <div>✓ <strong>Категория</strong> (если указана) - должна совпадать на 100%</div>
                    <div>✓ <strong>Наименование</strong> - допускается совпадение от 50% до 100%</div>
                    <div style={{ marginTop: 4, color: '#1890ff' }}>
                      💡 При низком совпадении по наименованию вы сможете вручную выбрать нужную расценку
                    </div>
                  </div>
                }
                type="warning"
                showIcon
                style={{ marginTop: 12 }}
              />
              <Paragraph style={{ marginBottom: 0, marginTop: 12 }}>
                <strong>Важно:</strong> Без указания подкатегории строка будет отмечена как ошибочная!
              </Paragraph>
            </div>
          }
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
        />

        <Card style={{ marginBottom: 16 }}>
          <Space direction="vertical" style={{ width: '100%' }} size="large">
            <Space size="middle" wrap>
              <Upload
                accept=".xlsx,.xls"
                beforeUpload={handleFileUpload}
                showUploadList={false}
                maxCount={1}
              >
                <Button
                  icon={<UploadOutlined />}
                  size="large"
                  style={{
                    borderRadius: 10,
                    height: 44,
                  }}
                >
                  Загрузить Excel файл
                </Button>
              </Upload>

              <Button
                type="primary"
                icon={<FileExcelOutlined />}
                size="large"
                onClick={handleAutoMatch}
                disabled={importData.length === 0 || processing || ratesLoading}
                loading={processing}
                style={{
                  borderRadius: 10,
                  height: 44,
                }}
              >
                Автоматический подбор расценок
              </Button>

              <div>
                <Text strong style={{ marginRight: 8 }}>Порог автоподбора:</Text>
                <Radio.Group
                  value={autoMatchThreshold}
                  onChange={e => setAutoMatchThreshold(e.target.value)}
                  disabled={processing}
                >
                  <Radio.Button value={0.95}>Строгий (95%)</Radio.Button>
                  <Radio.Button value={0.9}>Норма (90%)</Radio.Button>
                  <Radio.Button value={0.8}>Мягкий (80%)</Radio.Button>
                </Radio.Group>
              </div>
            </Space>

            {processing && (
              <div>
                <Text>Обработка позиций...</Text>
                <Progress
                  percent={Math.round((processedCount / importData.length) * 100)}
                  status="active"
                />
              </div>
            )}
          </Space>
        </Card>

        {importData.length > 0 && (
          <Card style={{ marginBottom: 16 }}>
            <Row gutter={16}>
              <Col span={6}>
                <Statistic
                  title="Всего позиций"
                  value={stats.total}
                  prefix={<InfoCircleOutlined />}
                />
              </Col>
              <Col span={6}>
                <Statistic
                  title="Точных совпадений"
                  value={stats.exactMatch}
                  valueStyle={{ color: '#52c41a' }}
                  prefix={<CheckCircleOutlined />}
                />
              </Col>
              <Col span={6}>
                <Statistic
                  title="Хороших совпадений"
                  value={stats.goodMatch}
                  valueStyle={{ color: '#1890ff' }}
                  prefix={<CheckCircleOutlined />}
                />
              </Col>
              <Col span={6}>
                <Statistic
                  title="Успешность"
                  value={successRate.toFixed(0)}
                  suffix="%"
                  valueStyle={{ color: successRate >= 80 ? '#52c41a' : '#faad14' }}
                />
              </Col>
            </Row>
            <Divider />
            <Row gutter={16}>
              <Col span={12}>
                <Statistic
                  title="Требует проверки"
                  value={stats.needsReview}
                  valueStyle={{ color: '#faad14' }}
                  prefix={<WarningOutlined />}
                />
              </Col>
              <Col span={12}>
                <Statistic
                  title="Без совпадений"
                  value={stats.noMatch}
                  valueStyle={{ color: '#999' }}
                  prefix={<CloseCircleOutlined />}
                />
              </Col>
            </Row>
          </Card>
        )}

        {importData.length > 0 && (stats.exactMatch + stats.goodMatch) > 0 && (
          <Card style={{ marginBottom: 16 }}>
            <Space direction="vertical" style={{ width: '100%' }} size="middle">
              <div>
                <Title level={5} style={{ marginBottom: 8 }}>
                  Перенос в калькулятор смет
                </Title>
                <Text type="secondary">
                  Перенести {stats.exactMatch + stats.goodMatch} успешно подобранных расценок
                  в калькулятор смет вместе с их материалами из сборника расценок
                </Text>
              </div>
              <Button
                type="primary"
                size="large"
                icon={<SendOutlined />}
                onClick={handleTransferToCalculator}
                loading={transferring}
                disabled={transferring}
                style={{
                  borderRadius: 10,
                  height: 48,
                  fontSize: 16,
                  fontWeight: 600,
                }}
              >
                Перенести в калькулятор ({stats.exactMatch + stats.goodMatch})
              </Button>
            </Space>
          </Card>
        )}
      </div>

      <div className="modern-page-content">
        {importData.length > 0 && (
          <Table
            className="modern-table"
            columns={columns}
            dataSource={importData}
            rowKey="id"
            pagination={{
              showSizeChanger: true,
              showQuickJumper: true,
              showTotal: (total, range) =>
                `${range[0]}-${range[1]} из ${total} записей`,
              pageSizeOptions: ['10', '20', '50', '100'],
              defaultPageSize: 20,
            }}
            scroll={{ x: 'max-content' }}
          />
        )}

        {importData.length === 0 && (
          <Card>
            <div style={{ textAlign: 'center', padding: '40px 0' }}>
              <FileExcelOutlined style={{ fontSize: 64, color: '#d9d9d9' }} />
              <Title level={4} style={{ marginTop: 16, color: '#999' }}>
                Загрузите Excel файл для начала работы
              </Title>
            </div>
          </Card>
        )}
      </div>

      {/* Модальное окно выбора расценки */}
      <Modal
        title={`Выбор расценки для: ${currentReviewItem?.workName || ''}`}
        open={isReviewModalOpen}
        onCancel={() => {
          setIsReviewModalOpen(false)
          setSearchTerm('')
          setSelectedSubcategory('')
        }}
        footer={[
          <Button key="skip" onClick={handleSkipItem}>
            Пропустить
          </Button>,
          <Button
            key="cancel"
            onClick={() => {
              setIsReviewModalOpen(false)
              setSearchTerm('')
              setSelectedSubcategory('')
            }}
          >
            Отмена
          </Button>,
        ]}
        width={1000}
      >
        {currentReviewItem && (
          <div>
            <Card size="small" style={{ marginBottom: 16, background: '#f5f5f5' }}>
              <Space direction="vertical" size="small" style={{ width: '100%' }}>
                <Text strong>Информация о позиции:</Text>
                <div>
                  <Text type="secondary">Единица измерения:</Text> {currentReviewItem.unit}
                </div>
                <div>
                  <Text type="secondary">Объем:</Text> {currentReviewItem.volume}
                </div>
                {currentReviewItem.subcategory && (
                  <div>
                    <Text type="secondary">Подкатегория:</Text> {currentReviewItem.subcategory}
                  </div>
                )}
              </Space>
            </Card>

            {/* Фильтры для поиска расценок */}
            <Card size="small" style={{ marginBottom: 16 }}>
              <Space direction="vertical" style={{ width: '100%' }} size="middle">
                <div>
                  <Text strong style={{ marginBottom: 8, display: 'block' }}>
                    Фильтры поиска:
                  </Text>
                  <Space direction="vertical" style={{ width: '100%' }} size="small">
                    <Input
                      placeholder="Поиск по наименованию, коду или описанию..."
                      prefix={<SearchOutlined />}
                      value={searchTerm}
                      onChange={e => setSearchTerm(e.target.value)}
                      allowClear
                    />
                    <Select
                      placeholder="Выберите подкатегорию"
                      value={selectedSubcategory || undefined}
                      onChange={value => setSelectedSubcategory(value || '')}
                      allowClear
                      showSearch
                      style={{ width: '100%' }}
                      filterOption={(input, option) => {
                        const text = option?.children?.toString() || ''
                        return text.toLowerCase().includes(input.toLowerCase())
                      }}
                    >
                      {uniqueSubcategories.map(subcategory => (
                        <Select.Option key={subcategory} value={subcategory}>
                          {subcategory}
                        </Select.Option>
                      ))}
                    </Select>
                  </Space>
                </div>
              </Space>
            </Card>

            {(() => {
              const filteredRates = getFilteredRatesForManualSelection()
              const hasMatches = currentReviewItem.matches && currentReviewItem.matches.length > 0

              if (filteredRates.length === 0) {
                return (
                  <Alert
                    message="Расценок не найдено"
                    description="Попробуйте изменить фильтры поиска"
                    type="warning"
                    showIcon
                  />
                )
              }

              return (
                <div>
                  <div style={{ marginBottom: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text strong>
                      {hasMatches ? 'Похожие расценки' : 'Все доступные расценки'} ({filteredRates.length})
                    </Text>
                    {searchTerm || selectedSubcategory ? (
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        Применены фильтры
                      </Text>
                    ) : null}
                  </div>
                  <div style={{ maxHeight: 400, overflowY: 'auto' }}>
                    {filteredRates.slice(0, 50).map(rate => {
                      const match = currentReviewItem.matches?.find(m => m.rateId === rate.id)

                      return (
                        <Card
                          key={rate.id}
                          size="small"
                          style={{ marginBottom: 12, cursor: 'pointer' }}
                          hoverable
                          onClick={() => handleSelectRate(rate.id)}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                            <div style={{ flex: 1 }}>
                              <div style={{ marginBottom: 4 }}>
                                <Text strong>{rate.name}</Text>
                              </div>
                              <Space size="small" wrap>
                                <Tag>{rate.code}</Tag>
                                <Tag>{rate.unit_name}</Tag>
                                <Tag color="blue">{rate.base_price} ₽</Tag>
                                {match && (
                                  <Tag
                                    color={
                                      getMatchQuality(match) === 'exact'
                                        ? 'green'
                                        : getMatchQuality(match) === 'good'
                                        ? 'blue'
                                        : 'orange'
                                    }
                                  >
                                    Совпадение: {(match.score * 100).toFixed(1)}%
                                  </Tag>
                                )}
                              </Space>
                              {rate.subcategory && (
                                <div style={{ marginTop: 4 }}>
                                  <Text type="secondary" style={{ fontSize: 12 }}>
                                    📂 {rate.subcategory}
                                  </Text>
                                </div>
                              )}
                              {match && (
                                <div style={{ marginTop: 4 }}>
                                  <Text type="secondary" style={{ fontSize: 12 }}>
                                    {formatMatchInfo(match)}
                                  </Text>
                                </div>
                              )}
                            </div>
                          </div>
                        </Card>
                      )
                    })}
                    {filteredRates.length > 50 && (
                      <Alert
                        message={`Показано 50 из ${filteredRates.length} расценок`}
                        description="Используйте фильтры для сужения поиска"
                        type="info"
                        showIcon
                        style={{ marginTop: 12 }}
                      />
                    )}
                  </div>
                </div>
              )
            })()}
          </div>
        )}
      </Modal>
    </div>
  )
}

export default EstimateImport
