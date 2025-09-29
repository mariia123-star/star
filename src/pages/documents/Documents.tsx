import { Tabs, Card, Typography, Button, Space, Table, Tag } from 'antd'
import { FileTextOutlined, PlusOutlined, EditOutlined, DeleteOutlined, CalculatorOutlined } from '@ant-design/icons'
import TenderEstimate from './TenderEstimate'
import EstimatePortal from './EstimatePortal'

const { TabPane } = Tabs
const { Title } = Typography

function Documents() {
  const testDocuments = [
    {
      key: '1',
      name: 'Смета на демонтаж стен',
      type: 'Тендерная смета',
      project: 'ЖК Московский',
      status: 'Активна',
      created: '2025-01-15',
      total: '125 000 ₽'
    },
    {
      key: '2',
      name: 'Смета на строительные работы',
      type: 'Рабочая смета',
      project: 'ТЦ Галерея',
      status: 'Черновик',
      created: '2025-01-14',
      total: '2 450 000 ₽'
    },
    {
      key: '3',
      name: 'Смета на отделочные работы',
      type: 'Тендерная смета',
      project: 'Офис Центр',
      status: 'Завершена',
      created: '2025-01-10',
      total: '850 000 ₽'
    }
  ]

  const columns = [
    {
      title: 'Наименование',
      dataIndex: 'name',
      key: 'name',
      sorter: true,
    },
    {
      title: 'Тип документа',
      dataIndex: 'type',
      key: 'type',
      filters: [
        { text: 'Тендерная смета', value: 'Тендерная смета' },
        { text: 'Рабочая смета', value: 'Рабочая смета' },
      ],
      onFilter: (value: any, record: any) => record.type === value,
    },
    {
      title: 'Проект',
      dataIndex: 'project',
      key: 'project',
      sorter: true,
    },
    {
      title: 'Статус',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        const color = status === 'Активна' ? 'green' : status === 'Черновик' ? 'orange' : 'blue'
        return <Tag color={color}>{status}</Tag>
      },
      filters: [
        { text: 'Активна', value: 'Активна' },
        { text: 'Черновик', value: 'Черновик' },
        { text: 'Завершена', value: 'Завершена' },
      ],
      onFilter: (value: any, record: any) => record.status === value,
    },
    {
      title: 'Дата создания',
      dataIndex: 'created',
      key: 'created',
      sorter: true,
    },
    {
      title: 'Общая сумма',
      dataIndex: 'total',
      key: 'total',
      sorter: true,
    },
    {
      title: 'Действия',
      key: 'actions',
      render: () => (
        <Space>
          <Button icon={<EditOutlined />} size="small" />
          <Button icon={<DeleteOutlined />} size="small" danger />
        </Space>
      ),
    },
  ]

  const DocumentsList = () => (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Title level={4} style={{ margin: 0 }}>Список документов</Title>
        <Button type="primary" icon={<PlusOutlined />}>
          Создать документ
        </Button>
      </div>

      <Card>
        <Table
          columns={columns}
          dataSource={testDocuments}
          pagination={{
            total: testDocuments.length,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) => `${range[0]}-${range[1]} из ${total} документов`,
          }}
          size="small"
        />
      </Card>
    </div>
  )

  return (
    <div style={{ padding: '24px' }}>
      <Tabs defaultActiveKey="documents-list" size="large">
        <TabPane
          tab={
            <span>
              <FileTextOutlined />
              Документы
            </span>
          }
          key="documents-list"
        >
          <DocumentsList />
        </TabPane>
        <TabPane
          tab={
            <span>
              <FileTextOutlined />
              Тендерная смета
            </span>
          }
          key="tender-estimate"
        >
          <TenderEstimate />
        </TabPane>
        <TabPane
          tab={
            <span>
              <CalculatorOutlined />
              Веб-портал тендерной сметы
            </span>
          }
          key="estimate-portal"
        >
          <EstimatePortal />
        </TabPane>
      </Tabs>
    </div>
  )
}

export default Documents
