import React from 'react'
import {
  Card,
  Row,
  Col,
  Typography,
  Statistic,
  Table,
  Progress,
  Space,
  Tag,
} from 'antd'
import {
  DashboardOutlined,
  DollarOutlined,
  BuildOutlined,
  FileTextOutlined,
  RiseOutlined,
  TruckOutlined,
} from '@ant-design/icons'
import {
  EstimateCalculations,
  EstimateAnalytics,
  EstimateItem,
} from '@/shared/types/estimate'

const { Title } = Typography

interface DashboardProps {
  calculations: EstimateCalculations
  analytics: EstimateAnalytics
  items: EstimateItem[]
}

const Dashboard: React.FC<DashboardProps> = ({
  calculations,
  analytics,
  items: _items,
}) => {
  const formatCurrency = (value: number) => {
    return value.toLocaleString('ru-RU', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    })
  }

  const formatNumber = (value: number, decimals = 2) => {
    return value.toLocaleString('ru-RU', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    })
  }

  // Колонки для таблицы распределения по заказчикам
  const contractorColumns = [
    {
      title: 'Заказчик',
      dataIndex: 'contractor',
      key: 'contractor',
      render: (text: string) => {
        const color =
          text === 'Заказчик' ? 'blue' : text === 'раб' ? 'orange' : 'default'
        return <Tag color={color}>{text}</Tag>
      },
    },
    {
      title: 'Сумма',
      dataIndex: 'total',
      key: 'total',
      align: 'right' as const,
      render: (value: number) => formatCurrency(value) + ' ₽',
    },
    {
      title: 'Количество',
      dataIndex: 'count',
      key: 'count',
      align: 'right' as const,
    },
    {
      title: 'Доля',
      dataIndex: 'percentage',
      key: 'percentage',
      align: 'right' as const,
      render: (value: number) => (
        <Space direction="vertical" size={0}>
          <span>{value.toFixed(1)}%</span>
          <Progress
            percent={value}
            showInfo={false}
            size="small"
            strokeColor={
              value > 50 ? '#52c41a' : value > 25 ? '#faad14' : '#1890ff'
            }
          />
        </Space>
      ),
    },
  ]

  // Колонки для таблицы топ дорогих позиций
  const expensiveItemsColumns = [
    {
      title: '№',
      dataIndex: 'number',
      key: 'number',
      width: 80,
    },
    {
      title: 'Наименование работ',
      dataIndex: 'workDescription',
      key: 'workDescription',
      ellipsis: true,
    },
    {
      title: 'Сумма',
      dataIndex: 'total',
      key: 'total',
      align: 'right' as const,
      width: 120,
      render: (value: number) => formatCurrency(value) + ' ₽',
    },
    {
      title: 'Объем',
      dataIndex: 'volume',
      key: 'volume',
      align: 'right' as const,
      width: 100,
      render: (value: number, record: EstimateItem) =>
        `${formatNumber(value, 2)} ${record.unit}`,
    },
  ]

  // Колонки для таблицы по единицам измерения
  const unitColumns = [
    {
      title: 'Единица',
      dataIndex: 'unit',
      key: 'unit',
    },
    {
      title: 'Общий объем',
      dataIndex: 'totalVolume',
      key: 'totalVolume',
      align: 'right' as const,
      render: (value: number) => formatNumber(value, 2),
    },
    {
      title: 'Средняя цена',
      dataIndex: 'avgPrice',
      key: 'avgPrice',
      align: 'right' as const,
      render: (value: number) => formatCurrency(value) + ' ₽',
    },
    {
      title: 'Позиций',
      dataIndex: 'count',
      key: 'count',
      align: 'right' as const,
    },
  ]

  console.log('Dashboard: Рендеринг дашборда', {
    totalSum: calculations.totalSum,
    itemsCount: calculations.itemsCount,
    contractorsCount: analytics.byContractor.length,
    timestamp: new Date().toISOString(),
  })

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <Title level={3}>
          <DashboardOutlined style={{ marginRight: 8 }} />
          Аналитика сметы
        </Title>
      </div>

      {/* Основные показатели */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={12} sm={8} lg={6}>
          <Card>
            <Statistic
              title="Общая сумма"
              value={calculations.totalSum}
              precision={0}
              valueStyle={{ color: '#1890ff' }}
              prefix={<DollarOutlined />}
              suffix="₽"
              formatter={value => formatCurrency(Number(value))}
            />
          </Card>
        </Col>
        <Col xs={12} sm={8} lg={6}>
          <Card>
            <Statistic
              title="Количество позиций"
              value={calculations.itemsCount}
              prefix={<FileTextOutlined />}
            />
          </Card>
        </Col>
        <Col xs={12} sm={8} lg={6}>
          <Card>
            <Statistic
              title="Общий объем"
              value={calculations.totalVolume}
              precision={2}
              prefix={<BuildOutlined />}
              formatter={value => formatNumber(Number(value), 2)}
            />
          </Card>
        </Col>
        <Col xs={12} sm={8} lg={6}>
          <Card>
            <Statistic
              title="Стоимость работ"
              value={calculations.totalWorkCost}
              precision={0}
              valueStyle={{ color: '#52c41a' }}
              prefix={<RiseOutlined />}
              suffix="₽"
              formatter={value => formatCurrency(Number(value))}
            />
          </Card>
        </Col>
        <Col xs={12} sm={8} lg={6}>
          <Card>
            <Statistic
              title="Стоимость материалов"
              value={calculations.totalMaterialCost}
              precision={0}
              valueStyle={{ color: '#faad14' }}
              prefix={<BuildOutlined />}
              suffix="₽"
              formatter={value => formatCurrency(Number(value))}
            />
          </Card>
        </Col>
        <Col xs={12} sm={8} lg={6}>
          <Card>
            <Statistic
              title="Стоимость доставки"
              value={calculations.totalDeliveryCost}
              precision={0}
              valueStyle={{ color: '#722ed1' }}
              prefix={<TruckOutlined />}
              suffix="₽"
              formatter={value => formatCurrency(Number(value))}
            />
          </Card>
        </Col>
      </Row>

      {/* Таблицы аналитики */}
      <Row gutter={[16, 16]}>
        <Col xs={24} lg={12}>
          <Card
            title="Распределение по заказчикам"
            size="small"
            style={{ height: '400px' }}
          >
            <Table
              columns={contractorColumns}
              dataSource={analytics.byContractor.map((item, index) => ({
                ...item,
                key: index,
              }))}
              pagination={false}
              size="small"
              scroll={{ y: 280 }}
            />
          </Card>
        </Col>

        <Col xs={24} lg={12}>
          <Card
            title="Распределение по типам материалов"
            size="small"
            style={{ height: '400px' }}
          >
            <Table
              columns={[
                {
                  title: 'Тип материала',
                  dataIndex: 'materialType',
                  key: 'materialType',
                  ellipsis: true,
                },
                {
                  title: 'Сумма',
                  dataIndex: 'total',
                  key: 'total',
                  align: 'right' as const,
                  render: (value: number) => formatCurrency(value) + ' ₽',
                },
                {
                  title: 'Доля',
                  dataIndex: 'percentage',
                  key: 'percentage',
                  align: 'right' as const,
                  render: (value: number) => (
                    <Space direction="vertical" size={0}>
                      <span>{value.toFixed(1)}%</span>
                      <Progress
                        percent={value}
                        showInfo={false}
                        size="small"
                        strokeColor="#52c41a"
                      />
                    </Space>
                  ),
                },
              ]}
              dataSource={analytics.byMaterialType.map((item, index) => ({
                ...item,
                key: index,
              }))}
              pagination={false}
              size="small"
              scroll={{ y: 280 }}
            />
          </Card>
        </Col>

        <Col xs={24} lg={12}>
          <Card
            title="Топ дорогих позиций"
            size="small"
            style={{ height: '400px' }}
          >
            <Table
              columns={expensiveItemsColumns}
              dataSource={analytics.topExpensiveItems.map((item, index) => ({
                ...item,
                key: index,
              }))}
              pagination={false}
              size="small"
              scroll={{ y: 280 }}
            />
          </Card>
        </Col>

        <Col xs={24} lg={12}>
          <Card
            title="Аналитика по единицам измерения"
            size="small"
            style={{ height: '400px' }}
          >
            <Table
              columns={unitColumns}
              dataSource={analytics.byUnit.map((item, index) => ({
                ...item,
                key: index,
              }))}
              pagination={false}
              size="small"
              scroll={{ y: 280 }}
            />
          </Card>
        </Col>
      </Row>
    </div>
  )
}

export default Dashboard
