import React, { useState } from 'react'
import {
  Table,
  Card,
  Typography,
  DatePicker,
  Select,
  Row,
  Col,
  Tag,
  Space,
  Button,
  Statistic,
  message,
} from 'antd'
import {
  EyeOutlined,
  EditOutlined,
  DeleteOutlined,
  PlusOutlined,
  DownloadOutlined,
  LoginOutlined,
  LogoutOutlined,
  FileTextOutlined,
  ReloadOutlined,
} from '@ant-design/icons'
import { useQuery } from '@tanstack/react-query'
import { auditLogApi, type AuditLogEntry } from '@/shared/api/audit-log-api'
import dayjs, { Dayjs } from 'dayjs'

const { Title } = Typography
const { RangePicker } = DatePicker

// Карта иконок для типов действий
const actionIcons: Record<string, React.ReactNode> = {
  create: <PlusOutlined style={{ color: '#52c41a' }} />,
  update: <EditOutlined style={{ color: '#1890ff' }} />,
  delete: <DeleteOutlined style={{ color: '#ff4d4f' }} />,
  view: <EyeOutlined style={{ color: '#722ed1' }} />,
  export: <DownloadOutlined style={{ color: '#fa8c16' }} />,
  import: <FileTextOutlined style={{ color: '#13c2c2' }} />,
  login: <LoginOutlined style={{ color: '#52c41a' }} />,
  logout: <LogoutOutlined style={{ color: '#ff4d4f' }} />,
  navigate: <FileTextOutlined style={{ color: '#1890ff' }} />,
}

// Карта цветов для тегов типов действий
const actionColors: Record<string, string> = {
  create: 'green',
  update: 'blue',
  delete: 'red',
  view: 'purple',
  export: 'orange',
  import: 'cyan',
  login: 'green',
  logout: 'red',
  navigate: 'blue',
}

function AuditLogs() {
  const [dateRange, setDateRange] = useState<[Dayjs, Dayjs] | null>(null)
  const [actionFilter, setActionFilter] = useState<string | undefined>()
  const [tableFilter, setTableFilter] = useState<string | undefined>()

  // Запрос логов с фильтрацией
  const {
    data: logs = [],
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ['auditLogs', dateRange, actionFilter, tableFilter],
    queryFn: () =>
      auditLogApi.getAll({
        action_type: actionFilter as string | undefined,
        table_name: tableFilter,
        date_from: dateRange?.[0]?.toISOString(),
        date_to: dateRange?.[1]?.toISOString(),
        limit: 1000,
      }),
    refetchInterval: 30000, // Обновляем каждые 30 секунд
  })

  // Запрос статистики
  const { data: statistics } = useQuery({
    queryKey: ['auditStatistics', dateRange],
    queryFn: () =>
      auditLogApi.getStatistics(
        dateRange?.[0]?.toISOString(),
        dateRange?.[1]?.toISOString()
      ),
    refetchInterval: 60000, // Обновляем каждую минуту
  })

  const handleExportLogs = () => {
    message.info('Экспорт логов в разработке')
  }

  // Колонки таблицы
  const columns = [
    {
      title: 'Время',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 200,
      render: (date: string) => dayjs(date).format('DD.MM.YYYY HH:mm:ss'),
      sorter: (a: AuditLogEntry, b: AuditLogEntry) =>
        dayjs(a.created_at).unix() - dayjs(b.created_at).unix(),
      defaultSortOrder: 'descend' as const,
    },
    {
      title: 'Действие',
      dataIndex: 'action_type',
      key: 'action_type',
      width: 120,
      render: (action: string) => (
        <Space>
          {actionIcons[action]}
          <Tag color={actionColors[action]}>{action.toUpperCase()}</Tag>
        </Space>
      ),
      filters: [
        { text: 'Создание', value: 'create' },
        { text: 'Обновление', value: 'update' },
        { text: 'Удаление', value: 'delete' },
        { text: 'Просмотр', value: 'view' },
        { text: 'Экспорт', value: 'export' },
        { text: 'Импорт', value: 'import' },
        { text: 'Навигация', value: 'navigate' },
      ],
      onFilter: (value: string | number | boolean, record: AuditLogEntry) =>
        record.action_type === value,
    },
    {
      title: 'Таблица/Раздел',
      dataIndex: 'table_name',
      key: 'table_name',
      width: 150,
      render: (tableName: string) => <Tag color="geekblue">{tableName}</Tag>,
      filters: [
        { text: 'Расценки', value: 'rates' },
        { text: 'Материалы', value: 'materials' },
        { text: 'Тендерные сметы', value: 'tender_estimates' },
        { text: 'Единицы измерения', value: 'units' },
        { text: 'Пользовательские действия', value: 'user_interaction' },
        { text: 'Навигация', value: 'navigation' },
      ],
      onFilter: (value: string | number | boolean, record: AuditLogEntry) =>
        record.table_name === value,
    },
    {
      title: 'Описание',
      dataIndex: 'changes_summary',
      key: 'changes_summary',
      ellipsis: true,
      render: (text: string) => text || 'Нет описания',
    },
    {
      title: 'ID записи',
      dataIndex: 'record_id',
      key: 'record_id',
      width: 120,
      render: (id: string) =>
        id ? <Tag color="default">{id.substring(0, 8)}...</Tag> : '—',
    },
    {
      title: 'Сессия',
      dataIndex: 'session_id',
      key: 'session_id',
      width: 120,
      render: (sessionId: string) =>
        sessionId ? (
          <Tag color="processing">{sessionId.substring(0, 8)}...</Tag>
        ) : (
          '—'
        ),
    },
    {
      title: 'Страница',
      dataIndex: 'page_url',
      key: 'page_url',
      width: 200,
      ellipsis: true,
      render: (url: string) => {
        if (!url) return '—'
        const pathname = new URL(url).pathname
        return <Tag color="cyan">{pathname}</Tag>
      },
    },
  ]

  return (
    <div style={{ padding: '24px' }}>
      <Title level={2}>Журнал аудита портала STAR</Title>

      {/* Статистика */}
      {statistics && (
        <Row gutter={16} style={{ marginBottom: 24 }}>
          <Col span={6}>
            <Card>
              <Statistic
                title="Всего действий"
                value={statistics.total_actions}
                valueStyle={{ color: '#1890ff' }}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="Создано записей"
                value={statistics.actions_by_type.create || 0}
                valueStyle={{ color: '#52c41a' }}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="Обновлено записей"
                value={statistics.actions_by_type.update || 0}
                valueStyle={{ color: '#1890ff' }}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="Удалено записей"
                value={statistics.actions_by_type.delete || 0}
                valueStyle={{ color: '#ff4d4f' }}
              />
            </Card>
          </Col>
        </Row>
      )}

      {/* Фильтры */}
      <Card style={{ marginBottom: 24 }}>
        <Row gutter={16} align="middle">
          <Col span={8}>
            <RangePicker
              placeholder={['Дата начала', 'Дата окончания']}
              value={dateRange}
              onChange={setDateRange}
              style={{ width: '100%' }}
              showTime
            />
          </Col>
          <Col span={4}>
            <Select
              placeholder="Тип действия"
              value={actionFilter}
              onChange={setActionFilter}
              allowClear
              style={{ width: '100%' }}
            >
              <Select.Option value="create">Создание</Select.Option>
              <Select.Option value="update">Обновление</Select.Option>
              <Select.Option value="delete">Удаление</Select.Option>
              <Select.Option value="view">Просмотр</Select.Option>
              <Select.Option value="export">Экспорт</Select.Option>
              <Select.Option value="import">Импорт</Select.Option>
              <Select.Option value="navigate">Навигация</Select.Option>
            </Select>
          </Col>
          <Col span={4}>
            <Select
              placeholder="Таблица"
              value={tableFilter}
              onChange={setTableFilter}
              allowClear
              style={{ width: '100%' }}
            >
              <Select.Option value="rates">Расценки</Select.Option>
              <Select.Option value="materials">Материалы</Select.Option>
              <Select.Option value="tender_estimates">
                Тендерные сметы
              </Select.Option>
              <Select.Option value="units">Единицы измерения</Select.Option>
              <Select.Option value="user_interaction">
                Действия пользователя
              </Select.Option>
              <Select.Option value="navigation">Навигация</Select.Option>
            </Select>
          </Col>
          <Col span={8}>
            <Space>
              <Button
                icon={<ReloadOutlined />}
                onClick={() => refetch()}
                loading={isLoading}
              >
                Обновить
              </Button>
              <Button icon={<DownloadOutlined />} onClick={handleExportLogs}>
                Экспортировать
              </Button>
            </Space>
          </Col>
        </Row>
      </Card>

      {/* Таблица логов */}
      <Card>
        <Table
          columns={columns}
          dataSource={logs}
          rowKey="id"
          loading={isLoading}
          pagination={{
            total: logs.length,
            pageSize: 50,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) =>
              `${range[0]}-${range[1]} из ${total} записей`,
          }}
          scroll={{ x: 1200 }}
          size="small"
        />
      </Card>
    </div>
  )
}

export default AuditLogs
