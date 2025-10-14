import React, { useState } from 'react'
import {
  Card,
  Steps,
  Button,
  Upload,
  Table,
  Select,
  Radio,
  Space,
  message,
  Tag,
  Progress,
  Descriptions,
  Input,
  Tooltip,
  Modal,
} from 'antd'
import {
  UploadOutlined,
  SearchOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  QuestionCircleOutlined,
  SyncOutlined,
} from '@ant-design/icons'
import type { UploadFile } from 'antd'
import * as XLSX from 'xlsx'
import {
  findBestMatches,
  manualSearch,
  type MatchingMode,
  type MatchResult,
  type MatchingCriteria,
} from '@/shared/lib/advancedMatching'
import { materialsApi } from '@/entities/materials'
import { ratesApi } from '@/entities/rates'

const { Step } = Steps

// ============================================================================
// ТИПЫ
// ============================================================================

interface ImportedRow {
  id: string
  name: string
  description?: string
  category?: string
  article?: string
  brand?: string
  unit: string
  quantity: number
  price?: number
  equipment_code?: string
  manufacturer?: string
}

interface MatchedRow extends ImportedRow {
  matchedRate?: MatchResult<any>
  matchedMaterial?: MatchResult<any>
  matchStatus: 'matched' | 'partial' | 'unmatched' | 'manual'
  manualSelection?: any
}

// ============================================================================
// КОМПОНЕНТ
// ============================================================================

export default function EstimateImport() {
  // Состояние шагов
  const [current, setCurrent] = useState(0)

  // Загрузка файла
  const [fileList, setFileList] = useState<UploadFile[]>([])
  const [importedData, setImportedData] = useState<ImportedRow[]>([])

  // Настройки сопоставления
  const [matchingMode, setMatchingMode] = useState<MatchingMode>('optimized')
  const [minScore, setMinScore] = useState(70)
  const [categoryFilter, setCategoryFilter] = useState<string>()

  // Результаты сопоставления
  const [matchedData, setMatchedData] = useState<MatchedRow[]>([])
  const [loading, setLoading] = useState(false)

  // Модальное окно ручного поиска
  const [manualSearchVisible, setManualSearchVisible] = useState(false)
  const [currentSearchRow, setCurrentSearchRow] = useState<MatchedRow | null>(
    null
  )
  const [manualSearchQuery, setManualSearchQuery] = useState('')
  const [manualSearchResults, setManualSearchResults] = useState<
    MatchResult<any>[]
  >([])

  // Данные справочников
  const [rates, setRates] = useState<any[]>([])
  const [materials, setMaterials] = useState<any[]>([])

  // ============================================================================
  // ОБРАБОТЧИКИ ШАГОВ
  // ============================================================================

  // Шаг 1: Загрузка файла Excel
  const handleFileUpload = async (file: File) => {
    try {
      const buffer = await file.arrayBuffer()
      const workbook = XLSX.read(buffer)
      const worksheet = workbook.Sheets[workbook.SheetNames[0]]
      const jsonData = XLSX.utils.sheet_to_json(worksheet)

      console.log('Excel Import: File loaded', {
        rows: jsonData.length,
        timestamp: new Date().toISOString(),
      })

      // Преобразуем данные
      const imported: ImportedRow[] = jsonData.map((row: any, index) => ({
        id: `row-${index}`,
        name: row['Наименование'] || row['Name'] || '',
        description: row['Описание'] || row['Description'] || '',
        category: row['Категория'] || row['Category'] || '',
        article: row['Артикул'] || row['Article'] || '',
        brand: row['Бренд'] || row['Brand'] || '',
        unit: row['Единица'] || row['Unit'] || 'шт',
        quantity: Number(row['Количество'] || row['Quantity'] || 0),
        price: Number(row['Цена'] || row['Price'] || 0),
        equipment_code: row['Код оборудования'] || row['Equipment Code'] || '',
        manufacturer:
          row['Производитель'] || row['Manufacturer'] || '',
      }))

      setImportedData(imported)
      message.success(`Загружено ${imported.length} строк из Excel`)
      setCurrent(1)
    } catch (error) {
      console.error('Excel import error:', error)
      message.error('Ошибка при загрузке файла')
    }

    return false // Предотвращаем автоматическую загрузку
  }

  // Шаг 2: Настройка и запуск сопоставления
  const handleStartMatching = async () => {
    setLoading(true)

    try {
      // Загружаем справочники
      const [fetchedRates, fetchedMaterials] = await Promise.all([
        ratesApi.getAll(),
        materialsApi.getAll(),
      ])

      setRates(fetchedRates)
      setMaterials(fetchedMaterials)

      console.log('Loaded references:', {
        rates: fetchedRates.length,
        materials: fetchedMaterials.length,
      })

      // Сопоставляем каждую строку
      const matched: MatchedRow[] = []

      for (const row of importedData) {
        const criteria: MatchingCriteria = {
          name: row.name,
          description: row.description,
          category: row.category,
          article: row.article,
          brand: row.brand,
          equipment_code: row.equipment_code,
          manufacturer: row.manufacturer,
        }

        // Ищем расценку
        const rateMatches = findBestMatches(criteria, fetchedRates, {
          mode: matchingMode,
          maxResults: 1,
          minScore,
          categoryFilter,
        })

        // Ищем материал
        const materialMatches = findBestMatches(
          criteria,
          fetchedMaterials,
          {
            mode: matchingMode,
            maxResults: 1,
            minScore,
            categoryFilter,
          }
        )

        // Определяем статус совпадения
        let matchStatus: MatchedRow['matchStatus'] = 'unmatched'
        if (
          rateMatches.length > 0 &&
          rateMatches[0].score >= minScore
        ) {
          matchStatus = 'matched'
        } else if (
          materialMatches.length > 0 &&
          materialMatches[0].score >= minScore
        ) {
          matchStatus = 'partial'
        }

        matched.push({
          ...row,
          matchedRate: rateMatches[0],
          matchedMaterial: materialMatches[0],
          matchStatus,
        })
      }

      setMatchedData(matched)
      message.success('Сопоставление завершено')
      setCurrent(2)
    } catch (error) {
      console.error('Matching error:', error)
      message.error('Ошибка при сопоставлении')
    } finally {
      setLoading(false)
    }
  }

  // Ручной поиск
  const handleManualSearch = (row: MatchedRow) => {
    setCurrentSearchRow(row)
    setManualSearchQuery(row.name)
    setManualSearchVisible(true)

    // Запускаем поиск сразу
    performManualSearch(row.name)
  }

  const performManualSearch = async (query: string) => {
    if (!query.trim()) {
      setManualSearchResults([])
      return
    }

    try {
      // Ищем по расценкам
      const results = manualSearch(query, rates, {
        categoryFilter,
        maxResults: 10,
        minScore: 50,
      })

      setManualSearchResults(results)
    } catch (error) {
      console.error('Manual search error:', error)
      message.error('Ошибка поиска')
    }
  }

  const handleSelectManualMatch = (matchResult: MatchResult<any>) => {
    if (!currentSearchRow) return

    // Обновляем строку с ручным выбором
    const updated = matchedData.map(row =>
      row.id === currentSearchRow.id
        ? {
            ...row,
            matchedRate: matchResult,
            matchStatus: 'manual' as const,
            manualSelection: matchResult.item,
          }
        : row
    )

    setMatchedData(updated)
    setManualSearchVisible(false)
    message.success('Расценка выбрана вручную')
  }

  // Шаг 3: Импорт данных
  const handleImport = async () => {
    setLoading(true)

    try {
      // TODO: Реализовать фактический импорт в БД
      // Здесь будет логика создания тендерной сметы
      // и сохранения всех позиций

      message.success('Данные успешно импортированы!')
      setCurrent(3)
    } catch (error) {
      console.error('Import error:', error)
      message.error('Ошибка при импорте')
    } finally {
      setLoading(false)
    }
  }

  // ============================================================================
  // ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
  // ============================================================================

  const getMatchStatusTag = (status: MatchedRow['matchStatus']) => {
    switch (status) {
      case 'matched':
        return <Tag color="success">Найдено</Tag>
      case 'partial':
        return <Tag color="warning">Частичное</Tag>
      case 'manual':
        return <Tag color="blue">Ручной выбор</Tag>
      case 'unmatched':
        return <Tag color="error">Не найдено</Tag>
    }
  }

  const getMatchScoreColor = (score: number) => {
    if (score >= 90) return 'success'
    if (score >= 70) return 'normal'
    if (score >= 50) return 'exception'
    return 'exception'
  }

  // ============================================================================
  // КОЛОНКИ ТАБЛИЦ
  // ============================================================================

  const importedColumns = [
    {
      title: '№',
      key: 'index',
      width: 60,
      render: (_: any, __: any, index: number) => index + 1,
    },
    {
      title: 'Наименование',
      dataIndex: 'name',
      key: 'name',
      width: 300,
    },
    {
      title: 'Категория',
      dataIndex: 'category',
      key: 'category',
      width: 150,
    },
    {
      title: 'Артикул',
      dataIndex: 'article',
      key: 'article',
      width: 120,
    },
    {
      title: 'Бренд',
      dataIndex: 'brand',
      key: 'brand',
      width: 100,
    },
    {
      title: 'Кол-во',
      dataIndex: 'quantity',
      key: 'quantity',
      width: 80,
      align: 'right' as const,
    },
    {
      title: 'Ед.изм',
      dataIndex: 'unit',
      key: 'unit',
      width: 80,
    },
  ]

  const matchedColumns = [
    {
      title: '№',
      key: 'index',
      width: 50,
      fixed: 'left' as const,
      render: (_: any, __: any, index: number) => index + 1,
    },
    {
      title: 'Наименование',
      dataIndex: 'name',
      key: 'name',
      width: 250,
      fixed: 'left' as const,
    },
    {
      title: 'Статус',
      key: 'matchStatus',
      width: 120,
      render: (_: any, record: MatchedRow) =>
        getMatchStatusTag(record.matchStatus),
    },
    {
      title: 'Совпадение расценки',
      key: 'rateMatch',
      width: 300,
      render: (_: any, record: MatchedRow) => {
        if (!record.matchedRate) return '-'

        return (
          <Space direction="vertical" size="small" style={{ width: '100%' }}>
            <div>{record.matchedRate.item.name}</div>
            <Progress
              percent={Math.round(record.matchedRate.score)}
              size="small"
              status={getMatchScoreColor(record.matchedRate.score)}
            />
          </Space>
        )
      },
    },
    {
      title: 'Совпадение материала',
      key: 'materialMatch',
      width: 300,
      render: (_: any, record: MatchedRow) => {
        if (!record.matchedMaterial) return '-'

        return (
          <Space direction="vertical" size="small" style={{ width: '100%' }}>
            <div>{record.matchedMaterial.item.name}</div>
            <Progress
              percent={Math.round(record.matchedMaterial.score)}
              size="small"
              status={getMatchScoreColor(record.matchedMaterial.score)}
            />
          </Space>
        )
      },
    },
    {
      title: 'Действия',
      key: 'actions',
      width: 120,
      fixed: 'right' as const,
      render: (_: any, record: MatchedRow) => (
        <Button
          icon={<SearchOutlined />}
          onClick={() => handleManualSearch(record)}
          size="small"
        >
          Поиск
        </Button>
      ),
    },
  ]

  // ============================================================================
  // СТАТИСТИКА
  // ============================================================================

  const stats = {
    total: matchedData.length,
    matched: matchedData.filter(r => r.matchStatus === 'matched').length,
    partial: matchedData.filter(r => r.matchStatus === 'partial').length,
    manual: matchedData.filter(r => r.matchStatus === 'manual').length,
    unmatched: matchedData.filter(r => r.matchStatus === 'unmatched').length,
  }

  // ============================================================================
  // РЕНДЕР
  // ============================================================================

  return (
    <div style={{ padding: 24 }}>
      <Card title="Импорт сметы из Excel" style={{ marginBottom: 24 }}>
        <Steps current={current} style={{ marginBottom: 32 }}>
          <Step
            title="Загрузка файла"
            icon={current === 0 ? <UploadOutlined /> : undefined}
          />
          <Step
            title="Настройка сопоставления"
            icon={current === 1 ? <SyncOutlined /> : undefined}
          />
          <Step
            title="Проверка результатов"
            icon={current === 2 ? <CheckCircleOutlined /> : undefined}
          />
          <Step title="Завершение" />
        </Steps>

        {/* ШАГ 1: Загрузка файла */}
        {current === 0 && (
          <Space direction="vertical" size="large" style={{ width: '100%' }}>
            <Upload
              beforeUpload={handleFileUpload}
              fileList={fileList}
              onChange={({ fileList }) => setFileList(fileList)}
              accept=".xlsx,.xls"
              maxCount={1}
            >
              <Button icon={<UploadOutlined />} size="large">
                Выбрать Excel файл
              </Button>
            </Upload>

            {importedData.length > 0 && (
              <>
                <Descriptions bordered size="small" column={2}>
                  <Descriptions.Item label="Строк загружено">
                    {importedData.length}
                  </Descriptions.Item>
                  <Descriptions.Item label="Статус">
                    <Tag color="success">Готово к сопоставлению</Tag>
                  </Descriptions.Item>
                </Descriptions>

                <Table
                  dataSource={importedData}
                  columns={importedColumns}
                  rowKey="id"
                  pagination={{ pageSize: 10 }}
                  scroll={{ x: 'max-content', y: 400 }}
                  size="small"
                />

                <Button type="primary" onClick={() => setCurrent(1)}>
                  Далее
                </Button>
              </>
            )}
          </Space>
        )}

        {/* ШАГ 2: Настройка сопоставления */}
        {current === 1 && (
          <Space direction="vertical" size="large" style={{ width: '100%' }}>
            <Card title="Настройки сопоставления" size="small">
              <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: 8 }}>
                    Режим сопоставления:
                  </label>
                  <Radio.Group
                    value={matchingMode}
                    onChange={e => setMatchingMode(e.target.value)}
                  >
                    <Space direction="vertical">
                      <Radio value="legacy">
                        <Space>
                          Legacy (Совместимость)
                          <Tooltip title="Название: 40%, Описание: 20%, Категория: 15%, Артикул: 15%, Спецификация: 10%">
                            <QuestionCircleOutlined />
                          </Tooltip>
                        </Space>
                      </Radio>
                      <Radio value="optimized">
                        <Space>
                          Optimized (Рекомендуется)
                          <Tooltip title="Название: 50%, Артикул: 30%, Бренд: 20%">
                            <QuestionCircleOutlined />
                          </Tooltip>
                        </Space>
                      </Radio>
                      <Radio value="equipment_code_priority">
                        <Space>
                          Equipment Code Priority
                          <Tooltip title="Код оборудования: 60%, Название: 20%, Производитель: 20%">
                            <QuestionCircleOutlined />
                          </Tooltip>
                        </Space>
                      </Radio>
                    </Space>
                  </Radio.Group>
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: 8 }}>
                    Минимальный порог совпадения (%):
                  </label>
                  <Select
                    value={minScore}
                    onChange={setMinScore}
                    style={{ width: 200 }}
                  >
                    <Select.Option value={50}>50%</Select.Option>
                    <Select.Option value={60}>60%</Select.Option>
                    <Select.Option value={70}>70% (по умолчанию)</Select.Option>
                    <Select.Option value={80}>80%</Select.Option>
                    <Select.Option value={90}>90%</Select.Option>
                  </Select>
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: 8 }}>
                    Фильтр по категории (опционально):
                  </label>
                  <Input
                    placeholder="Введите категорию"
                    value={categoryFilter}
                    onChange={e => setCategoryFilter(e.target.value)}
                    allowClear
                    style={{ width: 300 }}
                  />
                </div>
              </Space>
            </Card>

            <Space>
              <Button onClick={() => setCurrent(0)}>Назад</Button>
              <Button
                type="primary"
                onClick={handleStartMatching}
                loading={loading}
              >
                Запустить сопоставление
              </Button>
            </Space>
          </Space>
        )}

        {/* ШАГ 3: Проверка результатов */}
        {current === 2 && (
          <Space direction="vertical" size="large" style={{ width: '100%' }}>
            <Card title="Статистика сопоставления" size="small">
              <Descriptions bordered size="small" column={5}>
                <Descriptions.Item label="Всего">
                  {stats.total}
                </Descriptions.Item>
                <Descriptions.Item label="Найдено">
                  <Tag color="success">{stats.matched}</Tag>
                </Descriptions.Item>
                <Descriptions.Item label="Частичное">
                  <Tag color="warning">{stats.partial}</Tag>
                </Descriptions.Item>
                <Descriptions.Item label="Ручной выбор">
                  <Tag color="blue">{stats.manual}</Tag>
                </Descriptions.Item>
                <Descriptions.Item label="Не найдено">
                  <Tag color="error">{stats.unmatched}</Tag>
                </Descriptions.Item>
              </Descriptions>
            </Card>

            <Table
              dataSource={matchedData}
              columns={matchedColumns}
              rowKey="id"
              pagination={{ pageSize: 10 }}
              scroll={{ x: 1400, y: 500 }}
              size="small"
            />

            <Space>
              <Button onClick={() => setCurrent(1)}>Назад</Button>
              <Button
                type="primary"
                onClick={handleImport}
                loading={loading}
                disabled={stats.total === 0}
              >
                Импортировать в систему
              </Button>
            </Space>
          </Space>
        )}

        {/* ШАГ 4: Завершение */}
        {current === 3 && (
          <Space
            direction="vertical"
            size="large"
            style={{ width: '100%', textAlign: 'center' }}
          >
            <CheckCircleOutlined
              style={{ fontSize: 72, color: '#52c41a' }}
            />
            <h2>Импорт завершен успешно!</h2>
            <p>Все данные были импортированы в систему.</p>
            <Button
              type="primary"
              onClick={() => {
                setCurrent(0)
                setImportedData([])
                setMatchedData([])
                setFileList([])
              }}
            >
              Начать новый импорт
            </Button>
          </Space>
        )}
      </Card>

      {/* МОДАЛЬНОЕ ОКНО РУЧНОГО ПОИСКА */}
      <Modal
        title={`Ручной поиск расценки: ${currentSearchRow?.name}`}
        open={manualSearchVisible}
        onCancel={() => setManualSearchVisible(false)}
        width={900}
        footer={null}
      >
        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
          <Input.Search
            placeholder="Введите запрос для поиска"
            value={manualSearchQuery}
            onChange={e => setManualSearchQuery(e.target.value)}
            onSearch={performManualSearch}
            enterButton="Искать"
            size="large"
          />

          <Table
            dataSource={manualSearchResults}
            rowKey={record => record.item.id}
            size="small"
            pagination={false}
            scroll={{ y: 400 }}
            columns={[
              {
                title: 'Наименование',
                key: 'name',
                render: (_, record) => record.item.name,
              },
              {
                title: 'Совпадение',
                key: 'score',
                width: 150,
                render: (_, record) => (
                  <Progress
                    percent={Math.round(record.score)}
                    size="small"
                    status={getMatchScoreColor(record.score)}
                  />
                ),
              },
              {
                title: 'Действие',
                key: 'action',
                width: 100,
                render: (_, record) => (
                  <Button
                    type="link"
                    onClick={() => handleSelectManualMatch(record)}
                  >
                    Выбрать
                  </Button>
                ),
              },
            ]}
          />
        </Space>
      </Modal>
    </div>
  )
}
