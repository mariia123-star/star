import React, { useState, useEffect } from 'react'
import {
  Card,
  Button,
  Alert,
  Spin,
  Row,
  Col,
  Typography,
  Table,
  Input,
  Select,
  Space,
  Descriptions,
  message,
  Tooltip,
} from 'antd'
import {
  CloudUploadOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ExclamationCircleOutlined,
  GoogleOutlined,
  ApiOutlined,
  ReloadOutlined,
  FileExcelOutlined,
  DownloadOutlined,
  SearchOutlined,
} from '@ant-design/icons'

const { Title, Text } = Typography
const { Option } = Select

// API конфигурация
const API_BASE_URL = 'http://localhost:3001/api'
const SPREADSHEET_ID = '1RVpSotr5uJN9Aj2gsD94ZiogzhHvgnC7'
const SHEET_GID = '1192116578'

interface ImportStats {
  total: number
  imported: number
  errors: number
}

interface Position {
  id: string
  number: string
  justification: string
  materialType?: string
  workName: string
  unit: string
  volume: number
  workPrice?: number
  materialPrice?: number
  total: number
  level: number
  created_at: string
}

interface ImportResult {
  success: boolean
  message: string
  positions?: Position[]
  stats?: ImportStats
  errors?: any[]
  demo?: boolean
}

export default function GoogleSheetsImport() {
  const [importing, setImporting] = useState(false)
  const [testing, setTesting] = useState(false)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<ImportResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [importedData, setImportedData] = useState<Position[]>([])
  const [showPreview, setShowPreview] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState('all')
  const [connectionStatus, setConnectionStatus] = useState<
    'unknown' | 'success' | 'error'
  >('unknown')

  useEffect(() => {
    loadExistingData()
  }, [])

  const loadExistingData = async () => {
    setLoading(true)
    try {
      const response = await window.fetch(`${API_BASE_URL}/tender-items`)
      const items = await response.json()

      console.log('API Request:', {
        endpoint: '/tender-items',
        action: 'load',
        timestamp: new Date().toISOString(),
        success: response.ok,
      })

      if (items && Array.isArray(items)) {
        setImportedData(items)
        setShowPreview(true)
      }
    } catch (err) {
      console.error('Ошибка загрузки данных:', err)
    } finally {
      setLoading(false)
    }
  }

  const testConnection = async () => {
    setTesting(true)
    try {
      const response = await window.fetch(
        `${API_BASE_URL}/import/test-connection`
      )
      const data = await response.json()

      console.log('API Request:', {
        endpoint: '/import/test-connection',
        action: 'test',
        timestamp: new Date().toISOString(),
        success: data.success,
      })

      if (data.success) {
        setConnectionStatus('success')
        message.success(
          `Соединение установлено${data.demo ? ' (демо режим)' : ''}: ${data.title}`
        )
      } else {
        setConnectionStatus('error')
        message.error('Ошибка соединения: ' + data.error)
      }
    } catch (err: any) {
      setConnectionStatus('error')
      message.error('Ошибка: ' + err.message)
    } finally {
      setTesting(false)
    }
  }

  const handleImport = async () => {
    setImporting(true)
    setError(null)
    setResult(null)

    console.log('API Request:', {
      endpoint: '/import/google-sheets',
      action: 'import',
      timestamp: new Date().toISOString(),
    })

    try {
      const response = await window.fetch(
        `${API_BASE_URL}/import/google-sheets`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            spreadsheetId: SPREADSHEET_ID,
            sheetGid: SHEET_GID,
          }),
        }
      )

      const data = await response.json()

      console.log('API Response:', {
        success: data.success,
        stats: data.stats,
        demo: data.demo,
        timestamp: new Date().toISOString(),
      })

      if (data.success) {
        setResult(data)
        setImportedData(data.positions || [])
        setShowPreview(true)
        message.success(
          `Импорт завершён${data.demo ? ' (демо данные)' : ''}: ${data.positions?.length || 0} позиций`
        )
      } else {
        setError(data.message || 'Ошибка импорта')
        message.error('Ошибка импорта')
      }
    } catch (err: any) {
      setError('Ошибка соединения с сервером: ' + err.message)
      message.error('Ошибка соединения с сервером')
    } finally {
      setImporting(false)
    }
  }

  const exportToCSV = () => {
    const headers = [
      '№',
      'Обоснование',
      'Тип материала',
      'Наименование работ',
      'Ед.изм.',
      'Объём',
      'Цена работ',
      'Цена материалов',
      'Итого',
    ]
    const csvContent = [
      headers.join(','),
      ...filteredData.map(item =>
        [
          item.number,
          `"${item.justification || ''}"`,
          `"${item.materialType || ''}"`,
          `"${item.workName || ''}"`,
          item.unit || '',
          item.volume || '',
          item.workPrice || '',
          item.materialPrice || '',
          item.total || '',
        ].join(',')
      ),
    ].join('\n')

    const blob = new window.Blob(['\ufeff' + csvContent], {
      type: 'text/csv;charset=utf-8;',
    })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `tender_export_${new Date().toISOString().split('T')[0]}.csv`
    link.click()

    message.success('Файл экспортирован')
  }

  // Фильтрация данных
  const filteredData = importedData.filter(item => {
    if (filterType === 'main' && item.level > 0) return false
    if (filterType === 'sub' && item.level === 0) return false
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase()
      return (
        item.workName?.toLowerCase().includes(searchLower) ||
        item.number?.includes(searchTerm) ||
        item.justification?.toLowerCase().includes(searchLower)
      )
    }
    return true
  })

  const totalSum = importedData
    .filter(item => item.level === 0)
    .reduce((sum, item) => sum + (item.total || 0), 0)

  const columns = [
    {
      title: '№ п/п',
      dataIndex: 'number',
      key: 'number',
      width: 80,
      render: (text: string, record: Position) => (
        <span
          style={{
            paddingLeft: record.level === 0 ? 0 : 20,
            fontWeight: record.level === 0 ? 'bold' : 'normal',
          }}
        >
          {text}
        </span>
      ),
    },
    {
      title: 'Обоснование',
      dataIndex: 'justification',
      key: 'justification',
      width: 120,
      render: (text: string) => (
        <span
          style={{
            backgroundColor:
              text === 'подрядчик'
                ? '#F8CBAD'
                : text === 'раб'
                  ? '#A4C2F4'
                  : text === 'мат'
                    ? '#d9f7be'
                    : 'transparent',
            padding: '2px 6px',
            borderRadius: '4px',
            fontSize: '12px',
          }}
        >
          {text}
        </span>
      ),
    },
    {
      title: 'Тип материала',
      dataIndex: 'materialType',
      key: 'materialType',
      width: 120,
      render: (text: string) => text || '—',
    },
    {
      title: 'Наименование работ',
      dataIndex: 'workName',
      key: 'workName',
      ellipsis: true,
      render: (text: string, record: Position) => (
        <Tooltip title={text}>
          <span style={{ fontWeight: record.level === 0 ? 'bold' : 'normal' }}>
            {text}
          </span>
        </Tooltip>
      ),
    },
    {
      title: 'Ед. изм.',
      dataIndex: 'unit',
      key: 'unit',
      width: 80,
      align: 'center' as const,
    },
    {
      title: 'Объём',
      dataIndex: 'volume',
      key: 'volume',
      width: 100,
      align: 'right' as const,
      render: (value: number) => value?.toFixed(2) || '—',
    },
    {
      title: 'Цена работ',
      dataIndex: 'workPrice',
      key: 'workPrice',
      width: 120,
      align: 'right' as const,
      render: (value: number) =>
        value
          ? value.toLocaleString('ru-RU', { minimumFractionDigits: 2 })
          : '—',
    },
    {
      title: 'Цена мат-лов',
      dataIndex: 'materialPrice',
      key: 'materialPrice',
      width: 120,
      align: 'right' as const,
      render: (value: number) =>
        value
          ? value.toLocaleString('ru-RU', { minimumFractionDigits: 2 })
          : '—',
    },
    {
      title: 'Итого, руб.',
      dataIndex: 'total',
      key: 'total',
      width: 130,
      align: 'right' as const,
      render: (value: number, record: Position) => (
        <span
          style={{
            fontWeight: record.level === 0 ? 'bold' : 'normal',
            color: record.level === 0 ? '#52c41a' : '#666',
          }}
        >
          {value
            ? value.toLocaleString('ru-RU', { minimumFractionDigits: 2 })
            : '—'}
        </span>
      ),
    },
  ]

  const getStatusColor = () => {
    switch (connectionStatus) {
      case 'success':
        return 'success'
      case 'error':
        return 'error'
      default:
        return 'warning'
    }
  }

  const getStatusText = () => {
    switch (connectionStatus) {
      case 'success':
        return 'Соединение установлено'
      case 'error':
        return 'Ошибка соединения'
      default:
        return 'Статус неизвестен'
    }
  }

  return (
    <div
      style={{
        height: 'calc(100vh - 96px)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      <div style={{ flexShrink: 0, paddingBottom: 16 }}>
        <Title level={2} style={{ margin: 0, marginBottom: 24 }}>
          <GoogleOutlined style={{ marginRight: 8, color: '#4285f4' }} />
          Импорт данных из Google Sheets
        </Title>

        <Card style={{ marginBottom: 16 }}>
          <Space direction="vertical" style={{ width: '100%' }}>
            <Row justify="space-between" align="middle">
              <Col>
                <Space>
                  <Text strong>Статус соединения:</Text>
                  <Alert
                    message={getStatusText()}
                    type={getStatusColor()}
                    showIcon
                    style={{ marginBottom: 0 }}
                  />
                </Space>
              </Col>
              <Col>
                <Space>
                  <Button
                    onClick={testConnection}
                    loading={testing}
                    icon={<ApiOutlined />}
                  >
                    Проверить соединение
                  </Button>
                  <Button
                    onClick={() =>
                      window.open(
                        `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/edit#gid=${SHEET_GID}`,
                        '_blank'
                      )
                    }
                    icon={<FileExcelOutlined />}
                  >
                    Открыть таблицу
                  </Button>
                  <Button
                    onClick={loadExistingData}
                    loading={loading}
                    icon={<ReloadOutlined />}
                  >
                    Обновить
                  </Button>
                </Space>
              </Col>
            </Row>

            <Descriptions size="small" column={2}>
              <Descriptions.Item label="Таблица">
                Google Sheets (ID: {SPREADSHEET_ID.substring(0, 20)}...)
              </Descriptions.Item>
              <Descriptions.Item label="Лист">
                GID: {SHEET_GID}
              </Descriptions.Item>
            </Descriptions>

            <Row gutter={16}>
              <Col flex="auto">
                <Button
                  type="primary"
                  onClick={handleImport}
                  loading={importing}
                  disabled={connectionStatus !== 'success'}
                  icon={<CloudUploadOutlined />}
                  size="large"
                  style={{ width: '100%' }}
                >
                  {importing ? 'Импорт данных...' : 'Импортировать данные'}
                </Button>
              </Col>
            </Row>
          </Space>
        </Card>

        {error && (
          <Alert
            type="error"
            showIcon
            icon={<CloseCircleOutlined />}
            message="Ошибка импорта"
            description={error}
            style={{ marginBottom: 16 }}
            closable
            onClose={() => setError(null)}
          />
        )}

        {result && (
          <Card
            title={
              <Space>
                <CheckCircleOutlined style={{ color: '#52c41a' }} />
                Результат импорта{result.demo && ' (демо данные)'}
              </Space>
            }
            style={{ marginBottom: 16 }}
          >
            <Row gutter={16}>
              <Col span={6}>
                <div
                  style={{
                    textAlign: 'center',
                    padding: '16px',
                    background: '#f0f2f5',
                    borderRadius: '8px',
                  }}
                >
                  <div
                    style={{
                      fontSize: '24px',
                      fontWeight: 'bold',
                      color: '#1890ff',
                    }}
                  >
                    {result.stats?.total || 0}
                  </div>
                  <div style={{ color: '#666', fontSize: '12px' }}>
                    Всего записей
                  </div>
                </div>
              </Col>
              <Col span={6}>
                <div
                  style={{
                    textAlign: 'center',
                    padding: '16px',
                    background: '#f6ffed',
                    borderRadius: '8px',
                  }}
                >
                  <div
                    style={{
                      fontSize: '24px',
                      fontWeight: 'bold',
                      color: '#52c41a',
                    }}
                  >
                    {result.stats?.imported || 0}
                  </div>
                  <div style={{ color: '#666', fontSize: '12px' }}>
                    Импортировано
                  </div>
                </div>
              </Col>
              <Col span={6}>
                <div
                  style={{
                    textAlign: 'center',
                    padding: '16px',
                    background: '#fff2f0',
                    borderRadius: '8px',
                  }}
                >
                  <div
                    style={{
                      fontSize: '24px',
                      fontWeight: 'bold',
                      color: '#ff4d4f',
                    }}
                  >
                    {result.stats?.errors || 0}
                  </div>
                  <div style={{ color: '#666', fontSize: '12px' }}>Ошибок</div>
                </div>
              </Col>
              <Col span={6}>
                <div
                  style={{
                    textAlign: 'center',
                    padding: '16px',
                    background: '#e6f7ff',
                    borderRadius: '8px',
                  }}
                >
                  <div
                    style={{
                      fontSize: '24px',
                      fontWeight: 'bold',
                      color: '#1890ff',
                    }}
                  >
                    {totalSum.toLocaleString('ru-RU', {
                      maximumFractionDigits: 0,
                    })}
                  </div>
                  <div style={{ color: '#666', fontSize: '12px' }}>
                    Общая сумма, ₽
                  </div>
                </div>
              </Col>
            </Row>
          </Card>
        )}

        {showPreview && filteredData.length > 0 && (
          <Card style={{ marginBottom: 16 }}>
            <Row gutter={16} align="middle">
              <Col flex="auto">
                <Input
                  placeholder="Поиск по наименованию, номеру или обоснованию..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  prefix={<SearchOutlined />}
                />
              </Col>
              <Col>
                <Select
                  value={filterType}
                  onChange={setFilterType}
                  style={{ width: 200 }}
                >
                  <Option value="all">
                    Все записи ({importedData.length})
                  </Option>
                  <Option value="main">
                    Основные ({importedData.filter(i => i.level === 0).length})
                  </Option>
                  <Option value="sub">
                    Подстроки ({importedData.filter(i => i.level > 0).length})
                  </Option>
                </Select>
              </Col>
              <Col>
                <Button
                  onClick={exportToCSV}
                  icon={<DownloadOutlined />}
                  type="default"
                >
                  Экспорт CSV
                </Button>
              </Col>
            </Row>
          </Card>
        )}
      </div>

      {showPreview && filteredData.length > 0 && (
        <div style={{ flex: 1, overflow: 'hidden', minHeight: 0 }}>
          <Card
            title={`Импортированные данные (${filteredData.length})`}
            style={{ height: '100%', display: 'flex', flexDirection: 'column' }}
            bodyStyle={{ flex: 1, overflow: 'hidden', padding: 0 }}
          >
            <Table
              columns={columns}
              dataSource={filteredData}
              rowKey="id"
              size="small"
              sticky
              scroll={{
                x: 'max-content',
                y: 'calc(100vh - 450px)',
              }}
              pagination={{
                pageSize: 50,
                showSizeChanger: true,
                showQuickJumper: true,
                showTotal: (total, range) =>
                  `${range[0]}-${range[1]} из ${total} записей`,
              }}
              rowClassName={(record: Position) =>
                record.level === 0 ? 'main-row' : 'sub-row'
              }
              summary={() => (
                <Table.Summary fixed>
                  <Table.Summary.Row>
                    <Table.Summary.Cell index={0} colSpan={8}>
                      <strong>Общая сумма (основные позиции):</strong>
                    </Table.Summary.Cell>
                    <Table.Summary.Cell index={1}>
                      <strong style={{ color: '#52c41a', fontSize: '16px' }}>
                        {totalSum.toLocaleString('ru-RU', {
                          minimumFractionDigits: 2,
                        })}{' '}
                        ₽
                      </strong>
                    </Table.Summary.Cell>
                  </Table.Summary.Row>
                </Table.Summary>
              )}
            />
          </Card>
        </div>
      )}

      {!showPreview && !loading && (
        <Card title="Инструкции по импорту">
          <ol style={{ paddingLeft: '20px' }}>
            <li>Убедитесь, что Google Sheets таблица доступна</li>
            <li>Проверьте настройки API на сервере (файл .env)</li>
            <li>Нажмите "Проверить соединение" для проверки</li>
            <li>Нажмите "Импортировать данные" для загрузки</li>
            <li>Проверьте результаты в таблице ниже</li>
            <li>При необходимости экспортируйте данные в CSV</li>
          </ol>
        </Card>
      )}

      <style>{`
        .main-row {
          background-color: #fafafa;
          font-weight: 600;
        }
        .sub-row {
          background-color: #fff;
        }
        .ant-table-summary {
          background-color: #f0f2f5;
        }
      `}</style>
    </div>
  )
}
