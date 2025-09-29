import React, { useState } from 'react'
import {
  Card,
  Typography,
  InputNumber,
  Button,
  Space,
  Divider,
  Row,
  Col,
  Radio,
  Tooltip,
  Alert,
  Timeline,
  Tag
} from 'antd'
import {
  CalculatorOutlined,
  PercentageOutlined,
  UndoOutlined,
  HistoryOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined
} from '@ant-design/icons'
import { EstimateItem, EstimateModification } from '@/shared/types/estimate'

const { Title, Text } = Typography

interface CalculatorProps {
  items: EstimateItem[]
  modifications: EstimateModification[]
  onApplyVolumeChange: (percentage: number) => void
  onApplyPriceChange: (field: 'workPrice' | 'materialPriceWithVAT' | 'deliveryPrice', percentage: number) => void
  onUndoModification: (modificationId: string) => void
  loading?: boolean
}

const Calculator: React.FC<CalculatorProps> = ({
  items,
  modifications,
  onApplyVolumeChange,
  onApplyPriceChange,
  onUndoModification,
  loading = false
}) => {
  const [volumePercentage, setVolumePercentage] = useState<number>(0)
  const [pricePercentage, setPricePercentage] = useState<number>(0)
  const [selectedPriceField, setSelectedPriceField] = useState<'workPrice' | 'materialPriceWithVAT' | 'deliveryPrice'>('workPrice')

  const handleVolumeChange = () => {
    if (volumePercentage !== 0) {
      console.log('Calculator: Применяем изменение объема', {
        percentage: volumePercentage,
        timestamp: new Date().toISOString()
      })

      onApplyVolumeChange(volumePercentage)
      setVolumePercentage(0)
    }
  }

  const handlePriceChange = () => {
    if (pricePercentage !== 0) {
      console.log('Calculator: Применяем изменение цены', {
        field: selectedPriceField,
        percentage: pricePercentage,
        timestamp: new Date().toISOString()
      })

      onApplyPriceChange(selectedPriceField, pricePercentage)
      setPricePercentage(0)
    }
  }

  const getFieldLabel = (field: string) => {
    switch (field) {
      case 'workPrice':
        return 'Цена работы'
      case 'materialPriceWithVAT':
        return 'Цена материалов'
      case 'deliveryPrice':
        return 'Доставка'
      default:
        return field
    }
  }

  // const formatPercentage = (value: number) => {
  //   const sign = value > 0 ? '+' : ''
  //   return `${sign}${value.toFixed(1)}%`
  // }

  const formatCurrency = (value: number) => {
    return value.toLocaleString('ru-RU', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }) + ' ₽'
  }

  const calculatePotentialImpact = (percentage: number, field?: string) => {
    let totalImpact = 0
    let affectedItems = 0

    items.forEach(item => {
      if (field === 'volume' && item.volume) {
        const newVolume = item.volume * (1 + percentage / 100)
        const newTotal = (item.total / item.volume) * newVolume
        totalImpact += newTotal - item.total
        affectedItems++
      } else if (field && item[field as keyof EstimateItem] && item.volume) {
        const oldPrice = item[field as keyof EstimateItem] as number
        const newPrice = oldPrice * (1 + percentage / 100)
        const priceDiff = newPrice - oldPrice
        totalImpact += priceDiff * item.volume
        affectedItems++
      }
    })

    return { totalImpact, affectedItems }
  }

  const volumeImpact = volumePercentage !== 0 ? calculatePotentialImpact(volumePercentage, 'volume') : null
  const priceImpact = pricePercentage !== 0 ? calculatePotentialImpact(pricePercentage, selectedPriceField) : null

  const recentModifications = modifications
    .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
    .slice(0, 10)

  return (
    <Row gutter={[16, 16]}>
      <Col xs={24} lg={12}>
        <Card
          title={
            <Space>
              <CalculatorOutlined />
              <span>Калькулятор изменений</span>
            </Space>
          }
          size="small"
        >
          {/* Изменение объемов */}
          <div style={{ marginBottom: 24 }}>
            <Title level={5}>
              <PercentageOutlined style={{ marginRight: 8 }} />
              Изменение объемов
            </Title>

            <Space direction="vertical" style={{ width: '100%' }}>
              <Row gutter={8} align="middle">
                <Col flex="auto">
                  <InputNumber
                    value={volumePercentage}
                    onChange={(value) => setVolumePercentage(value || 0)}
                    style={{ width: '100%' }}
                    step={0.1}
                    precision={1}
                    formatter={(value) => `${value}%`}
                    parser={(value) => value!.replace('%', '')}
                    placeholder="Изменение в %"
                  />
                </Col>
                <Col>
                  <Button
                    type="primary"
                    onClick={handleVolumeChange}
                    disabled={volumePercentage === 0 || loading}
                    loading={loading}
                  >
                    Применить
                  </Button>
                </Col>
              </Row>

              {volumeImpact && (
                <Alert
                  type={volumeImpact.totalImpact > 0 ? 'warning' : 'info'}
                  showIcon
                  message={
                    <Space>
                      {volumeImpact.totalImpact > 0 ? <ArrowUpOutlined /> : <ArrowDownOutlined />}
                      <Text>
                        Изменение: {formatCurrency(Math.abs(volumeImpact.totalImpact))}
                      </Text>
                      <Text type="secondary">
                        ({volumeImpact.affectedItems} позиций)
                      </Text>
                    </Space>
                  }
                  style={{ marginTop: 8 }}
                />
              )}
            </Space>
          </div>

          <Divider />

          {/* Изменение цен */}
          <div>
            <Title level={5}>
              <PercentageOutlined style={{ marginRight: 8 }} />
              Изменение цен
            </Title>

            <Space direction="vertical" style={{ width: '100%' }}>
              <Radio.Group
                value={selectedPriceField}
                onChange={(e) => setSelectedPriceField(e.target.value)}
                style={{ width: '100%' }}
              >
                <Radio.Button value="workPrice">Работы</Radio.Button>
                <Radio.Button value="materialPriceWithVAT">Материалы</Radio.Button>
                <Radio.Button value="deliveryPrice">Доставка</Radio.Button>
              </Radio.Group>

              <Row gutter={8} align="middle">
                <Col flex="auto">
                  <InputNumber
                    value={pricePercentage}
                    onChange={(value) => setPricePercentage(value || 0)}
                    style={{ width: '100%' }}
                    step={0.1}
                    precision={1}
                    formatter={(value) => `${value}%`}
                    parser={(value) => value!.replace('%', '')}
                    placeholder="Изменение в %"
                  />
                </Col>
                <Col>
                  <Button
                    type="primary"
                    onClick={handlePriceChange}
                    disabled={pricePercentage === 0 || loading}
                    loading={loading}
                  >
                    Применить
                  </Button>
                </Col>
              </Row>

              {priceImpact && (
                <Alert
                  type={priceImpact.totalImpact > 0 ? 'warning' : 'info'}
                  showIcon
                  message={
                    <Space>
                      {priceImpact.totalImpact > 0 ? <ArrowUpOutlined /> : <ArrowDownOutlined />}
                      <Text>
                        Изменение: {formatCurrency(Math.abs(priceImpact.totalImpact))}
                      </Text>
                      <Text type="secondary">
                        ({priceImpact.affectedItems} позиций)
                      </Text>
                    </Space>
                  }
                  style={{ marginTop: 8 }}
                />
              )}
            </Space>
          </div>

          <Divider />

          {/* Быстрые действия */}
          <div>
            <Title level={5}>Быстрые действия</Title>
            <Space wrap>
              <Tooltip title="Увеличить объемы на 10%">
                <Button
                  size="small"
                  onClick={() => { setVolumePercentage(10); globalThis.setTimeout(handleVolumeChange, 100) }}
                  disabled={loading}
                >
                  +10% объем
                </Button>
              </Tooltip>
              <Tooltip title="Уменьшить объемы на 10%">
                <Button
                  size="small"
                  onClick={() => { setVolumePercentage(-10); globalThis.setTimeout(handleVolumeChange, 100) }}
                  disabled={loading}
                >
                  -10% объем
                </Button>
              </Tooltip>
              <Tooltip title="Увеличить цены работ на 5%">
                <Button
                  size="small"
                  onClick={() => {
                    setSelectedPriceField('workPrice')
                    setPricePercentage(5)
                    globalThis.setTimeout(handlePriceChange, 100)
                  }}
                  disabled={loading}
                >
                  +5% работы
                </Button>
              </Tooltip>
              <Tooltip title="Увеличить цены материалов на 5%">
                <Button
                  size="small"
                  onClick={() => {
                    setSelectedPriceField('materialPriceWithVAT')
                    setPricePercentage(5)
                    globalThis.setTimeout(handlePriceChange, 100)
                  }}
                  disabled={loading}
                >
                  +5% материалы
                </Button>
              </Tooltip>
            </Space>
          </div>
        </Card>
      </Col>

      <Col xs={24} lg={12}>
        <Card
          title={
            <Space>
              <HistoryOutlined />
              <span>История изменений</span>
            </Space>
          }
          size="small"
        >
          {recentModifications.length === 0 ? (
            <Text type="secondary">Изменений пока нет</Text>
          ) : (
            <Timeline
              size="small"
              items={recentModifications.map(mod => ({
                children: (
                  <div>
                    <Space direction="vertical" size={0} style={{ width: '100%' }}>
                      <Space>
                        <Text strong>{mod.description}</Text>
                        <Tag size="small">{getFieldLabel(mod.field as string)}</Tag>
                      </Space>
                      <Text type="secondary" style={{ fontSize: '12px' }}>
                        {mod.timestamp.toLocaleString('ru-RU')}
                      </Text>
                      <Space>
                        <Text type="secondary">
                          {typeof mod.oldValue === 'number'
                            ? formatCurrency(mod.oldValue)
                            : String(mod.oldValue)
                          }
                        </Text>
                        <span>→</span>
                        <Text>
                          {typeof mod.newValue === 'number'
                            ? formatCurrency(mod.newValue)
                            : String(mod.newValue)
                          }
                        </Text>
                        <Button
                          type="text"
                          size="small"
                          icon={<UndoOutlined />}
                          onClick={() => onUndoModification(mod.id)}
                          disabled={loading}
                        />
                      </Space>
                    </Space>
                  </div>
                ),
                color: 'blue'
              }))}
            />
          )}
        </Card>
      </Col>
    </Row>
  )
}

export default Calculator