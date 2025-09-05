import { useState } from 'react'
import { 
  Table, 
  Button, 
  Space, 
  Typography, 
  Modal, 
  Form, 
  Input, 
  InputNumber,
  Select, 
  message,
  Popconfirm,
  Row,
  Col
} from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined, CalculatorOutlined } from '@ant-design/icons'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { 
  tenderEstimatesApi, 
  TenderEstimateWithUnit,
  TenderEstimateCreate, 
  TenderEstimateUpdate 
} from '@/entities/tender-estimates'
import { unitsApi, Unit } from '@/entities/units'

const { Title } = Typography

interface EstimateFormData {
  materials: string
  works: string
  quantity: number
  unit_id: string
  unit_price?: number
  notes?: string
}

function TenderEstimate() {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingEstimate, setEditingEstimate] = useState<TenderEstimateWithUnit | null>(null)
  const [form] = Form.useForm<EstimateFormData>()
  
  const queryClient = useQueryClient()

  const { data: estimates = [], isLoading: estimatesLoading } = useQuery({
    queryKey: ['tender-estimates'],
    queryFn: tenderEstimatesApi.getAll,
  })

  const { data: units = [] } = useQuery({
    queryKey: ['units'],
    queryFn: unitsApi.getAll,
  })

  const createMutation = useMutation({
    mutationFn: tenderEstimatesApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tender-estimates'] })
      message.success('Смета успешно создана')
      handleCloseModal()
    },
    onError: (error) => {
      console.error('Create error:', error)
      message.error('Ошибка при создании сметы')
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: TenderEstimateUpdate }) =>
      tenderEstimatesApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tender-estimates'] })
      message.success('Смета успешно обновлена')
      handleCloseModal()
    },
    onError: (error) => {
      console.error('Update error:', error)
      message.error('Ошибка при обновлении сметы')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: tenderEstimatesApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tender-estimates'] })
      message.success('Смета успешно удалена')
    },
    onError: (error) => {
      console.error('Delete error:', error)
      message.error('Ошибка при удалении сметы')
    },
  })

  const handleAdd = () => {
    setEditingEstimate(null)
    form.resetFields()
    setIsModalOpen(true)
  }

  const handleEdit = (estimate: TenderEstimateWithUnit) => {
    setEditingEstimate(estimate)
    form.setFieldsValue({
      materials: estimate.materials,
      works: estimate.works,
      quantity: estimate.quantity,
      unit_id: estimate.unit_id,
      unit_price: estimate.unit_price,
      notes: estimate.notes,
    })
    setIsModalOpen(true)
  }

  const handleDelete = (id: string) => {
    deleteMutation.mutate(id)
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
    setEditingEstimate(null)
    form.resetFields()
  }

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields()
      
      if (editingEstimate) {
        updateMutation.mutate({
          id: editingEstimate.id,
          data: values,
        })
      } else {
        createMutation.mutate(values)
      }
    } catch (error) {
      console.error('Form validation error:', error)
    }
  }

  const formatCurrency = (value?: number) => {
    if (!value) return '—'
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: 'RUB',
    }).format(value)
  }

  const getTotalSum = () => {
    return estimates.reduce((sum, item) => sum + (item.total_price || 0), 0)
  }

  const columns = [
    {
      title: 'Материалы',
      dataIndex: 'materials',
      key: 'materials',
      width: 250,
      ellipsis: true,
    },
    {
      title: 'Работы',
      dataIndex: 'works',
      key: 'works',
      width: 250,
      ellipsis: true,
    },
    {
      title: 'Количество',
      dataIndex: 'quantity',
      key: 'quantity',
      width: 120,
      align: 'right' as const,
      render: (value: number) => value?.toLocaleString('ru-RU') || '0',
    },
    {
      title: 'Ед. изм.',
      dataIndex: 'unit_short_name',
      key: 'unit_short_name',
      width: 80,
      align: 'center' as const,
    },
    {
      title: 'Цена за ед.',
      dataIndex: 'unit_price',
      key: 'unit_price',
      width: 120,
      align: 'right' as const,
      render: formatCurrency,
    },
    {
      title: 'Общая стоимость',
      dataIndex: 'total_price',
      key: 'total_price',
      width: 140,
      align: 'right' as const,
      render: (value: number) => (
        <span style={{ fontWeight: 500, color: '#1677ff' }}>
          {formatCurrency(value)}
        </span>
      ),
    },
    {
      title: 'Действия',
      key: 'actions',
      width: 120,
      render: (_: unknown, record: TenderEstimateWithUnit) => (
        <Space>
          <Button
            type="text"
            size="small"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
            title="Редактировать"
          />
          <Popconfirm
            title="Удалить запись сметы?"
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
    <div style={{ height: 'calc(100vh - 112px)', display: 'flex', flexDirection: 'column' }}>
      <div style={{ flexShrink: 0, marginBottom: 16 }}>
        <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
          <Col>
            <Title level={2} style={{ margin: 0 }}>
              Тендерная смета
            </Title>
          </Col>
          <Col>
            <Space>
              <div style={{ 
                background: '#f6ffed', 
                border: '1px solid #b7eb8f',
                borderRadius: 6,
                padding: '4px 12px',
                display: 'flex',
                alignItems: 'center',
                gap: 8
              }}>
                <CalculatorOutlined style={{ color: '#52c41a' }} />
                <span style={{ fontWeight: 500 }}>
                  Итого: {formatCurrency(getTotalSum())}
                </span>
              </div>
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={handleAdd}
              >
                Добавить запись
              </Button>
            </Space>
          </Col>
        </Row>
      </div>

      <div style={{ flex: 1, overflow: 'hidden' }}>
        <Table
          columns={columns}
          dataSource={estimates}
          loading={estimatesLoading}
          rowKey="id"
          pagination={{
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) =>
              `${range[0]}-${range[1]} из ${total} записей`,
            pageSizeOptions: ['10', '20', '50', '100'],
            defaultPageSize: 20,
          }}
          scroll={{
            x: 'max-content',
            y: 'calc(100vh - 300px)',
          }}
          sticky
          summary={() => (
            <Table.Summary>
              <Table.Summary.Row>
                <Table.Summary.Cell index={0} colSpan={5}>
                  <strong>Итого:</strong>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={5} align="right">
                  <strong style={{ color: '#1677ff', fontSize: 16 }}>
                    {formatCurrency(getTotalSum())}
                  </strong>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={6} />
              </Table.Summary.Row>
            </Table.Summary>
          )}
        />
      </div>

      <Modal
        title={editingEstimate ? 'Редактировать запись сметы' : 'Добавить запись в смету'}
        open={isModalOpen}
        onOk={handleSubmit}
        onCancel={handleCloseModal}
        confirmLoading={createMutation.isPending || updateMutation.isPending}
        width={800}
      >
        <Form
          form={form}
          layout="vertical"
        >
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="materials"
                label="Материалы"
                rules={[
                  { required: true, message: 'Пожалуйста, введите материалы' },
                  { max: 500, message: 'Максимальная длина 500 символов' },
                ]}
              >
                <Input.TextArea
                  rows={3}
                  placeholder="Введите наименование материалов"
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="works"
                label="Работы"
                rules={[
                  { required: true, message: 'Пожалуйста, введите работы' },
                  { max: 500, message: 'Максимальная длина 500 символов' },
                ]}
              >
                <Input.TextArea
                  rows={3}
                  placeholder="Введите описание работ"
                />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item
                name="quantity"
                label="Количество"
                rules={[
                  { required: true, message: 'Пожалуйста, введите количество' },
                  { type: 'number', min: 0, message: 'Количество должно быть больше 0' },
                ]}
              >
                <InputNumber
                  style={{ width: '100%' }}
                  placeholder="0"
                  precision={4}
                  min={0}
                />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="unit_id"
                label="Единица измерения"
                rules={[
                  { required: true, message: 'Пожалуйста, выберите единицу измерения' },
                ]}
              >
                <Select
                  placeholder="Выберите единицу"
                  allowClear
                  showSearch
                  filterOption={(input, option) => {
                    const unit = units.find(u => u.id === option?.value) as Unit
                    if (!unit) return false
                    const searchText = input.toLowerCase()
                    return unit.name.toLowerCase().includes(searchText) ||
                           unit.short_name.toLowerCase().includes(searchText)
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
            <Col span={8}>
              <Form.Item
                name="unit_price"
                label="Цена за единицу"
                rules={[
                  { type: 'number', min: 0, message: 'Цена должна быть больше 0' },
                ]}
              >
                <InputNumber
                  style={{ width: '100%' }}
                  placeholder="0.00"
                  precision={2}
                  min={0}
                  addonAfter="₽"
                />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="notes"
            label="Примечания"
          >
            <Input.TextArea
              rows={2}
              placeholder="Дополнительные примечания (необязательно)"
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

export default TenderEstimate