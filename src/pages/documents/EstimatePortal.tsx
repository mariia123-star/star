import React, { useState } from 'react'
import { Tabs, Typography, Space, Button, Input, Card, Row, Col } from 'antd'
import {
  FileTextOutlined,
  TableOutlined,
  CalculatorOutlined,
  DashboardOutlined,
  ExportOutlined,
  SearchOutlined,
  ClearOutlined,
} from '@ant-design/icons'
import {
  EstimateProvider,
  useEstimateData,
  useEstimateActions,
} from '@/features/estimate'
import {
  FileUpload,
  EstimateTable,
  Calculator,
  Dashboard,
  ExportControls,
} from '@/widgets/estimate'

const { TabPane } = Tabs
const { Title } = Typography
const { Search } = Input

const EstimatePortalContent: React.FC = () => {
  const [activeTab, setActiveTab] = useState('upload')
  const {
    items,
    filteredItems,
    calculations,
    analytics,
    filters,
    modifications,
    selectedProjectId,
    isLoading,
  } = useEstimateData()
  const {
    loadFromCSV,
    updateItem,
    toggleExpanded,
    setFilters,
    clearData,
    undoModification,
    setSelectedProject,
  } = useEstimateActions()

  const handleDataLoaded = (result: any) => {
    console.log('EstimatePortal: Данные загружены', {
      itemsCount: result.data.length,
      timestamp: new Date().toISOString(),
    })

    if (result.data.length > 0) {
      setActiveTab('table')
    }
  }

  const handleSearch = (value: string) => {
    console.log('EstimatePortal: Поиск по данным', {
      searchValue: value,
      timestamp: new Date().toISOString(),
    })

    setFilters({ search: value })
  }

  const handleClearData = () => {
    console.log('EstimatePortal: Очистка всех данных', {
      timestamp: new Date().toISOString(),
    })

    clearData()
    setActiveTab('upload')
  }

  const tabItems = [
    {
      key: 'upload',
      label: (
        <Space>
          <FileTextOutlined />
          Загрузка файла
        </Space>
      ),
      children: (
        <div style={{ padding: '24px 0' }}>
          <FileUpload onDataLoaded={handleDataLoaded} loading={isLoading} />
        </div>
      ),
    },
    {
      key: 'table',
      label: (
        <Space>
          <TableOutlined />
          Таблица сметы
          {items.length > 0 && <span>({items.length})</span>}
        </Space>
      ),
      children: (
        <div>
          <div style={{ marginBottom: 16 }}>
            <Row gutter={[16, 16]} align="middle">
              <Col flex="auto">
                <Search
                  placeholder="Поиск по наименованию работ..."
                  value={filters.search}
                  onChange={e => handleSearch(e.target.value)}
                  onSearch={handleSearch}
                  style={{ maxWidth: 400 }}
                  prefix={<SearchOutlined />}
                  allowClear
                />
              </Col>
              <Col>
                <Space>
                  <Button
                    icon={<ClearOutlined />}
                    onClick={handleClearData}
                    disabled={items.length === 0}
                  >
                    Очистить данные
                  </Button>
                </Space>
              </Col>
            </Row>
          </div>

          <EstimateTable
            items={filteredItems}
            onItemUpdate={updateItem}
            onToggleExpanded={toggleExpanded}
            loading={isLoading}
          />
        </div>
      ),
      disabled: items.length === 0,
    },
    {
      key: 'calculator',
      label: (
        <Space>
          <CalculatorOutlined />
          Калькулятор
        </Space>
      ),
      children: (
        <div style={{ padding: '24px 0' }}>
          <Calculator
            items={items}
            modifications={modifications}
            onApplyVolumeChange={() => {}}
            onApplyPriceChange={() => {}}
            onUndoModification={undoModification}
            onProjectChange={setSelectedProject}
            selectedProjectId={selectedProjectId}
            loading={isLoading}
          />
        </div>
      ),
      disabled: items.length === 0,
    },
    {
      key: 'dashboard',
      label: (
        <Space>
          <DashboardOutlined />
          Аналитика
        </Space>
      ),
      children: (
        <div style={{ padding: '24px 0' }}>
          <Dashboard
            calculations={calculations}
            analytics={analytics}
            items={items}
          />
        </div>
      ),
      disabled: items.length === 0,
    },
    {
      key: 'export',
      label: (
        <Space>
          <ExportOutlined />
          Экспорт
        </Space>
      ),
      children: (
        <div style={{ padding: '24px 0' }}>
          <Row gutter={[16, 16]}>
            <Col xs={24} lg={12}>
              <ExportControls
                items={items}
                calculations={calculations}
                loading={isLoading}
              />
            </Col>
            <Col xs={24} lg={12}>
              <Card title="Информация о данных" size="small">
                <Space direction="vertical" style={{ width: '100%' }}>
                  <div>
                    <strong>Позиций в смете:</strong> {calculations.itemsCount}
                  </div>
                  <div>
                    <strong>Общая сумма:</strong>{' '}
                    {calculations.totalSum.toLocaleString('ru-RU')} ₽
                  </div>
                  <div>
                    <strong>Общий объем:</strong>{' '}
                    {calculations.totalVolume.toLocaleString('ru-RU', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </div>
                  <div>
                    <strong>Изменений:</strong> {modifications.length}
                  </div>
                  <div>
                    <strong>Последнее обновление:</strong>{' '}
                    {new Date().toLocaleString('ru-RU')}
                  </div>
                </Space>
              </Card>
            </Col>
          </Row>
        </div>
      ),
      disabled: items.length === 0,
    },
  ]

  return (
    <div
      style={{
        height: 'calc(100vh - 96px)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      <div style={{ flexShrink: 0, padding: '0 24px 16px' }}>
        <Title level={2}>
          <FileTextOutlined style={{ marginRight: 8 }} />
          Веб-портал тендерной сметы
        </Title>
      </div>

      <div style={{ flex: 1, overflow: 'hidden', minHeight: 0 }}>
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          size="large"
          items={tabItems}
          style={{ height: '100%' }}
          tabBarStyle={{ margin: '0 24px', paddingTop: 0 }}
        />
      </div>
    </div>
  )
}

const EstimatePortal: React.FC = () => {
  return (
    <EstimateProvider>
      <EstimatePortalContent />
    </EstimateProvider>
  )
}

export default EstimatePortal
