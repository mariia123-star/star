import { useState, useEffect, useMemo } from 'react'
import {
  Modal,
  Select,
  Card,
  Statistic,
  Row,
  Col,
  DatePicker,
  Space,
  Alert,
  Spin,
  Typography,
  Table,
} from 'antd'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Area,
  AreaChart,
} from 'recharts'
import {
  ArrowUpOutlined,
  ArrowDownOutlined,
  DollarOutlined,
} from '@ant-design/icons'
import dayjs from 'dayjs'
import type { MaterialWithUnit } from '@/entities/materials'
import {
  materialPriceHistoryApi,
  type MaterialPriceHistory,
  MATERIAL_CATEGORY_OPTIONS,
} from '@/entities/materials'

const { Title, Text } = Typography
const { RangePicker } = DatePicker

// Типизация валют
interface Currency {
  value: string
  label: string
  symbol: string
}

// Список поддерживаемых валют
const CURRENCIES = [
  { value: 'RUB', label: '₽ Российский рубль', symbol: '₽' },
  { value: 'USD', label: '$ Доллар США', symbol: '$' },
  { value: 'EUR', label: '€ Евро', symbol: '€' },
  { value: 'CNY', label: '¥ Китайский юань', symbol: '¥' },
  { value: 'KZT', label: '₸ Казахстанский тенге', symbol: '₸' },
] as const satisfies readonly Currency[]

type CurrencyCode = (typeof CURRENCIES)[number]['value']

interface MaterialPriceAnalyticsProps {
  visible: boolean
  onClose: () => void
  materials: MaterialWithUnit[]
}

interface PriceChartData {
  date: string
  price: number
  materialName?: string
  [key: string]: string | number | undefined // для динамических ключей материалов
}

export const MaterialPriceAnalytics = ({
  visible,
  onClose,
  materials,
}: MaterialPriceAnalyticsProps) => {
  const [selectedMaterials, setSelectedMaterials] = useState<string[]>([])
  const [selectedCategory, setSelectedCategory] = useState<string>('')
  const [selectedCurrency, setSelectedCurrency] = useState<CurrencyCode>('RUB')
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs]>([
    dayjs().subtract(3, 'month'),
    dayjs(),
  ])
  const [priceHistory, setPriceHistory] = useState<MaterialPriceHistory[]>([])
  const [loading, setLoading] = useState(false)
  const [chartData, setChartData] = useState<PriceChartData[]>([])
  const [statistics, setStatistics] = useState<{
    minPrice: number
    maxPrice: number
    avgPrice: number
    currentPrice: number
    priceChange: number
    priceChangePercent: number
  } | null>(null)

  // Мемоизация символа валюты для оптимизации
  const currencySymbol = useMemo(
    () => CURRENCIES.find(c => c.value === selectedCurrency)?.symbol || '₽',
    [selectedCurrency]
  )

  // Фильтрация материалов по категории
  const filteredMaterials = selectedCategory
    ? materials.filter(m => m.category === selectedCategory)
    : materials

  // Загрузка истории цен при изменении выбранных материалов или дат
  useEffect(() => {
    if (selectedMaterials.length === 0) {
      setPriceHistory([])
      setChartData([])
      setStatistics(null)
      return
    }

    const loadPriceHistory = async () => {
      setLoading(true)
      try {
        console.log('📊 Загрузка истории цен для аналитики', {
          materialIds: selectedMaterials,
          dateRange: {
            start: dateRange[0].format('YYYY-MM-DD'),
            end: dateRange[1].format('YYYY-MM-DD'),
          },
          timestamp: new Date().toISOString(),
        })

        const history = await materialPriceHistoryApi.getByMaterialIds(
          selectedMaterials
        )

        // Фильтруем по датам
        const filteredHistory = history.filter(item => {
          const itemDate = dayjs(item.created_at)
          return (
            itemDate.isAfter(dateRange[0]) && itemDate.isBefore(dateRange[1])
          )
        })

        setPriceHistory(filteredHistory)

        // Подготовка данных для графика
        const chartDataMap: { [key: string]: PriceChartData } = {}

        filteredHistory.forEach(item => {
          const material = materials.find(m => m.id === item.material_id)
          const dateKey = dayjs(item.created_at).format('DD.MM.YYYY HH:mm')

          if (selectedMaterials.length === 1) {
            // Для одного материала - простой график
            chartDataMap[dateKey] = {
              date: dateKey,
              price: item.price,
            }
          } else {
            // Для нескольких материалов - группируем по датам
            if (!chartDataMap[dateKey]) {
              chartDataMap[dateKey] = { date: dateKey, price: 0 }
            }
            chartDataMap[dateKey][material?.name || item.material_id] =
              item.price
          }
        })

        const sortedData = Object.values(chartDataMap).sort((a, b) => {
          return (
            dayjs(a.date, 'DD.MM.YYYY HH:mm').valueOf() -
            dayjs(b.date, 'DD.MM.YYYY HH:mm').valueOf()
          )
        })

        setChartData(sortedData)

        // Расчет статистики
        if (filteredHistory.length > 0) {
          const prices = filteredHistory.map(h => h.price)
          const minPrice = Math.min(...prices)
          const maxPrice = Math.max(...prices)
          const avgPrice = prices.reduce((a, b) => a + b, 0) / prices.length
          const currentPrice = filteredHistory[filteredHistory.length - 1].price
          const firstPrice = filteredHistory[0].price
          const priceChange = currentPrice - firstPrice
          const priceChangePercent =
            firstPrice > 0 ? (priceChange / firstPrice) * 100 : 0

          setStatistics({
            minPrice,
            maxPrice,
            avgPrice,
            currentPrice,
            priceChange,
            priceChangePercent,
          })
        }

        console.log('✅ История цен загружена', {
          count: filteredHistory.length,
          chartDataPoints: sortedData.length,
          timestamp: new Date().toISOString(),
        })
      } catch (error) {
        console.error('❌ Ошибка загрузки истории цен', error)
      } finally {
        setLoading(false)
      }
    }

    loadPriceHistory()
  }, [selectedMaterials, dateRange, materials])

  return (
    <Modal
      title={
        <div
          style={{
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            margin: '-20px -24px 20px -24px',
            padding: '20px 24px',
            color: 'white',
            fontSize: '18px',
            fontWeight: 600,
            borderRadius: '8px 8px 0 0',
          }}
        >
          📊 Аналитика изменения цен материалов
        </div>
      }
      open={visible}
      onCancel={onClose}
      width={1200}
      footer={null}
      style={{ top: 20 }}
      styles={{
        body: {
          background: 'linear-gradient(to bottom, #f7f9fc 0%, #e8eef5 100%)',
          padding: '24px',
        },
      }}
    >
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        {/* Фильтры */}
        <Card
          size="small"
          style={{
            background: 'white',
            borderRadius: '12px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
            border: 'none',
          }}
        >
          <Space direction="vertical" style={{ width: '100%' }}>
            <Row gutter={16}>
              <Col xs={24} sm={24} md={8}>
                <Text strong style={{ color: '#4a5568' }}>
                  Категория материалов:
                </Text>
                <Select
                  placeholder="Выберите категорию"
                  value={selectedCategory || undefined}
                  onChange={value => {
                    console.log('Category filter changed in analytics', {
                      action: 'analytics_category_change',
                      category: value,
                      timestamp: new Date().toISOString(),
                    })
                    setSelectedCategory(value || '')
                    setSelectedMaterials([])
                  }}
                  allowClear
                  showSearch
                  style={{ width: '100%', marginTop: 8 }}
                  filterOption={(input, option) => {
                    const text = option?.children?.toString() || ''
                    return text.toLowerCase().includes(input.toLowerCase())
                  }}
                >
                  {MATERIAL_CATEGORY_OPTIONS.map(cat => (
                    <Select.Option key={cat.value} value={cat.value}>
                      {cat.label}
                    </Select.Option>
                  ))}
                </Select>
              </Col>
              <Col xs={24} sm={24} md={8}>
                <Text strong style={{ color: '#4a5568' }}>
                  Период:
                </Text>
                <RangePicker
                  value={dateRange}
                  onChange={dates => {
                    if (dates && dates[0] && dates[1]) {
                      console.log('Date range changed in analytics', {
                        action: 'analytics_date_range_change',
                        startDate: dates[0].format('YYYY-MM-DD'),
                        endDate: dates[1].format('YYYY-MM-DD'),
                        timestamp: new Date().toISOString(),
                      })
                      setDateRange([dates[0], dates[1]])
                    }
                  }}
                  format="DD.MM.YYYY"
                  style={{ width: '100%', marginTop: 8 }}
                />
              </Col>
              <Col xs={24} sm={24} md={8}>
                <label htmlFor="currency-select">
                  <Text strong style={{ color: '#4a5568' }}>
                    Валюта:
                  </Text>
                </label>
                <Select
                  id="currency-select"
                  aria-label="Выбор валюты для отображения цен"
                  value={selectedCurrency}
                  onChange={value => {
                    console.log('Currency changed in analytics', {
                      action: 'analytics_currency_change',
                      currency: value,
                      timestamp: new Date().toISOString(),
                    })
                    setSelectedCurrency(value)
                  }}
                  style={{ width: '100%', marginTop: 8 }}
                  showSearch
                  allowClear
                  filterOption={(input, option) => {
                    const text = option?.children?.toString() || ''
                    return text.toLowerCase().includes(input.toLowerCase())
                  }}
                >
                  {CURRENCIES.map(currency => (
                    <Select.Option key={currency.value} value={currency.value}>
                      {currency.label}
                    </Select.Option>
                  ))}
                </Select>
              </Col>
            </Row>
            <div>
              <Text strong style={{ color: '#4a5568' }}>
                Материалы для анализа:
              </Text>
              <Select
                mode="multiple"
                placeholder="Выберите материалы"
                value={selectedMaterials}
                onChange={setSelectedMaterials}
                allowClear
                showSearch
                style={{ width: '100%', marginTop: 8 }}
                maxTagCount="responsive"
                filterOption={(input, option) => {
                  const text = option?.children?.toString() || ''
                  return text.toLowerCase().includes(input.toLowerCase())
                }}
              >
                {filteredMaterials.map(material => (
                  <Select.Option key={material.id} value={material.id}>
                    {material.name} ({material.code})
                  </Select.Option>
                ))}
              </Select>
            </div>
          </Space>
        </Card>

        {/* Статистика */}
        {selectedMaterials.length > 0 && statistics && !loading && (
          <Card
            size="small"
            style={{
              background: 'white',
              borderRadius: '12px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
              border: 'none',
            }}
          >
            <Row gutter={16}>
              <Col span={6}>
                <div
                  style={{
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    padding: '16px',
                    borderRadius: '8px',
                    color: 'white',
                  }}
                >
                  <Statistic
                    title={<span style={{ color: 'rgba(255,255,255,0.9)' }}>Текущая цена</span>}
                    value={statistics.currentPrice}
                    precision={2}
                    suffix={currencySymbol}
                    prefix={<DollarOutlined />}
                    valueStyle={{ color: 'white', fontSize: '24px' }}
                  />
                </div>
              </Col>
              <Col span={6}>
                <div
                  style={{
                    background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
                    padding: '16px',
                    borderRadius: '8px',
                    color: 'white',
                  }}
                >
                  <Statistic
                    title={<span style={{ color: 'rgba(255,255,255,0.9)' }}>Средняя цена</span>}
                    value={statistics.avgPrice}
                    precision={2}
                    suffix={currencySymbol}
                    valueStyle={{ color: 'white', fontSize: '24px' }}
                  />
                </div>
              </Col>
              <Col span={6}>
                <div
                  style={{
                    background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
                    padding: '16px',
                    borderRadius: '8px',
                    color: 'white',
                  }}
                >
                  <Statistic
                    title={<span style={{ color: 'rgba(255,255,255,0.9)' }}>Минимальная</span>}
                    value={statistics.minPrice}
                    precision={2}
                    suffix={currencySymbol}
                    valueStyle={{ color: 'white', fontSize: '24px' }}
                  />
                </div>
              </Col>
              <Col span={6}>
                <div
                  style={{
                    background: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
                    padding: '16px',
                    borderRadius: '8px',
                    color: 'white',
                  }}
                >
                  <Statistic
                    title={<span style={{ color: 'rgba(255,255,255,0.9)' }}>Максимальная</span>}
                    value={statistics.maxPrice}
                    precision={2}
                    suffix={currencySymbol}
                    valueStyle={{ color: 'white', fontSize: '24px' }}
                  />
                </div>
              </Col>
            </Row>
            <Row gutter={16} style={{ marginTop: 16 }}>
              <Col span={12}>
                <div
                  style={{
                    background:
                      statistics.priceChange >= 0
                        ? 'linear-gradient(135deg, #ff6b6b 0%, #ee5a6f 100%)'
                        : 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)',
                    padding: '16px',
                    borderRadius: '8px',
                    color: 'white',
                  }}
                >
                  <Statistic
                    title={<span style={{ color: 'rgba(255,255,255,0.9)' }}>Изменение цены</span>}
                    value={Math.abs(statistics.priceChange)}
                    precision={2}
                    suffix={currencySymbol}
                    prefix={
                      statistics.priceChange >= 0 ? (
                        <ArrowUpOutlined />
                      ) : (
                        <ArrowDownOutlined />
                      )
                    }
                    valueStyle={{ color: 'white', fontSize: '24px' }}
                  />
                </div>
              </Col>
              <Col span={12}>
                <div
                  style={{
                    background:
                      statistics.priceChangePercent >= 0
                        ? 'linear-gradient(135deg, #ff6b6b 0%, #ee5a6f 100%)'
                        : 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)',
                    padding: '16px',
                    borderRadius: '8px',
                    color: 'white',
                  }}
                >
                  <Statistic
                    title={<span style={{ color: 'rgba(255,255,255,0.9)' }}>Изменение (%)</span>}
                    value={Math.abs(statistics.priceChangePercent)}
                    precision={1}
                    suffix="%"
                    prefix={
                      statistics.priceChangePercent >= 0 ? (
                        <ArrowUpOutlined />
                      ) : (
                        <ArrowDownOutlined />
                      )
                    }
                    valueStyle={{ color: 'white', fontSize: '24px' }}
                  />
                </div>
              </Col>
            </Row>
          </Card>
        )}

        {/* График */}
        {loading && (
          <Card
            style={{
              background: 'white',
              borderRadius: '12px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
              border: 'none',
            }}
          >
            <div style={{ textAlign: 'center', padding: '40px 0' }}>
              <Spin size="large" tip="Загрузка данных..." />
            </div>
          </Card>
        )}

        {!loading && selectedMaterials.length === 0 && (
          <Alert
            message="Выберите материалы для анализа"
            description="Выберите один или несколько материалов из списка выше, чтобы увидеть график изменения цен"
            type="info"
            showIcon
          />
        )}

        {!loading && selectedMaterials.length > 0 && chartData.length === 0 && (
          <Alert
            message="Нет данных за выбранный период"
            description="За указанный период не найдено изменений цен для выбранных материалов"
            type="warning"
            showIcon
          />
        )}

        {!loading && chartData.length > 0 && (
          <Card
            title={
              <span style={{ fontSize: '16px', fontWeight: 600, color: '#1a202c' }}>
                📈 График изменения цен
              </span>
            }
            size="small"
            style={{
              background: 'white',
              borderRadius: '12px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
              border: 'none',
            }}
          >
            <ResponsiveContainer width="100%" height={400}>
              {selectedMaterials.length === 1 ? (
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#667eea" stopOpacity={0.8} />
                      <stop offset="95%" stopColor="#764ba2" stopOpacity={0.1} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="date" stroke="#718096" />
                  <YAxis stroke="#718096" />
                  <Tooltip
                    formatter={(value: number) =>
                      `${value.toFixed(2)} ${currencySymbol}`
                    }
                    contentStyle={{
                      background: 'rgba(255, 255, 255, 0.95)',
                      border: 'none',
                      borderRadius: '8px',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                    }}
                  />
                  <Legend />
                  <Area
                    type="monotone"
                    dataKey="price"
                    name="Цена"
                    stroke="#667eea"
                    strokeWidth={3}
                    fillOpacity={1}
                    fill="url(#colorPrice)"
                  />
                </AreaChart>
              ) : (
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="date" stroke="#718096" />
                  <YAxis stroke="#718096" />
                  <Tooltip
                    formatter={(value: number) =>
                      `${value.toFixed(2)} ${currencySymbol}`
                    }
                    contentStyle={{
                      background: 'rgba(255, 255, 255, 0.95)',
                      border: 'none',
                      borderRadius: '8px',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                    }}
                  />
                  <Legend />
                  {selectedMaterials.map((materialId, index) => {
                    const material = materials.find(m => m.id === materialId)
                    const colors = [
                      '#667eea',
                      '#f093fb',
                      '#4facfe',
                      '#fa709a',
                      '#ff6b6b',
                      '#11998e',
                    ]
                    return (
                      <Line
                        key={materialId}
                        type="monotone"
                        dataKey={material?.name || materialId}
                        name={material?.name}
                        stroke={colors[index % colors.length]}
                        strokeWidth={3}
                        dot={{ fill: colors[index % colors.length], r: 4 }}
                        activeDot={{ r: 6 }}
                      />
                    )
                  })}
                </LineChart>
              )}
            </ResponsiveContainer>
          </Card>
        )}

        {/* Таблица истории */}
        {!loading && priceHistory.length > 0 && (
          <Card
            title={
              <span style={{ fontSize: '16px', fontWeight: 600, color: '#1a202c' }}>
                📋 История изменений
              </span>
            }
            size="small"
            style={{
              background: 'white',
              borderRadius: '12px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
              border: 'none',
            }}
          >
            <Table
              dataSource={priceHistory}
              columns={[
                {
                  title: 'Дата',
                  dataIndex: 'created_at',
                  key: 'created_at',
                  render: (date: string) =>
                    dayjs(date).format('DD.MM.YYYY HH:mm'),
                  width: 150,
                },
                {
                  title: 'Материал',
                  dataIndex: 'material_id',
                  key: 'material_id',
                  render: (materialId: string) => {
                    const material = materials.find(m => m.id === materialId)
                    return material?.name || 'Неизвестный материал'
                  },
                },
                {
                  title: 'Цена',
                  dataIndex: 'price',
                  key: 'price',
                  render: (price: number) =>
                    `${price.toFixed(2)} ${currencySymbol}`,
                  width: 120,
                },
                {
                  title: 'Источник',
                  dataIndex: 'source',
                  key: 'source',
                  render: (source: string) => {
                    const sourceMap: Record<string, string> = {
                      manual: 'Ручное изменение',
                      estimate_calculator: 'Калькулятор смет',
                      import: 'Импорт',
                    }
                    return sourceMap[source] || source
                  },
                  width: 150,
                },
                {
                  title: 'Примечание',
                  dataIndex: 'notes',
                  key: 'notes',
                  ellipsis: true,
                },
              ]}
              rowKey="id"
              pagination={{
                pageSize: 10,
                showSizeChanger: true,
                showTotal: total => `Всего записей: ${total}`,
              }}
              size="small"
            />
          </Card>
        )}
      </Space>
    </Modal>
  )
}
