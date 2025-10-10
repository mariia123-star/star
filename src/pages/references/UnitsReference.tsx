import { useState } from 'react'
import {
  Table,
  Button,
  Space,
  Typography,
  Modal,
  Form,
  Input,
  Switch,
  message,
  Popconfirm,
} from 'antd'
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  ColumnHeightOutlined,
} from '@ant-design/icons'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { unitsApi, Unit, UnitUpdate } from '@/entities/units'

const { Title } = Typography

interface UnitFormData {
  name: string
  short_name: string
  description?: string
  is_active: boolean
}

function UnitsReference() {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingUnit, setEditingUnit] = useState<Unit | null>(null)
  const [form] = Form.useForm<UnitFormData>()

  const queryClient = useQueryClient()

  const { data: units = [], isLoading } = useQuery({
    queryKey: ['units'],
    queryFn: unitsApi.getAll,
  })

  const createMutation = useMutation({
    mutationFn: unitsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['units'] })
      message.success('Единица измерения успешно создана')
      handleCloseModal()
    },
    onError: error => {
      console.error('Create error:', error)
      message.error('Ошибка при создании единицы измерения')
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UnitUpdate }) =>
      unitsApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['units'] })
      message.success('Единица измерения успешно обновлена')
      handleCloseModal()
    },
    onError: error => {
      console.error('Update error:', error)
      message.error('Ошибка при обновлении единицы измерения')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: unitsApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['units'] })
      message.success('Единица измерения успешно удалена')
    },
    onError: error => {
      console.error('Delete error:', error)
      message.error('Ошибка при удалении единицы измерения')
    },
  })

  const handleAdd = () => {
    setEditingUnit(null)
    form.resetFields()
    form.setFieldsValue({ is_active: true })
    setIsModalOpen(true)
  }

  const handleEdit = (unit: Unit) => {
    setEditingUnit(unit)
    form.setFieldsValue(unit)
    setIsModalOpen(true)
  }

  const handleDelete = (id: string) => {
    deleteMutation.mutate(id)
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
    setEditingUnit(null)
    form.resetFields()
  }

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields()

      if (editingUnit) {
        updateMutation.mutate({
          id: editingUnit.id,
          data: values,
        })
      } else {
        createMutation.mutate(values)
      }
    } catch (error) {
      console.error('Form validation error:', error)
    }
  }

  const columns = [
    {
      title: 'Наименование',
      dataIndex: 'name',
      key: 'name',
      sorter: (a: Unit, b: Unit) => a.name.localeCompare(b.name),
    },
    {
      title: 'Сокращение',
      dataIndex: 'short_name',
      key: 'short_name',
      width: 120,
    },
    {
      title: 'Описание',
      dataIndex: 'description',
      key: 'description',
      render: (text: string) => text || '—',
    },
    {
      title: 'Активность',
      dataIndex: 'is_active',
      key: 'is_active',
      width: 100,
      render: (isActive: boolean) => (
        <span
          style={{
            color: isActive ? '#52c41a' : '#ff4d4f',
            fontWeight: 500,
          }}
        >
          {isActive ? 'Активен' : 'Неактивен'}
        </span>
      ),
    },
    {
      title: 'Действия',
      key: 'actions',
      width: 120,
      render: (_: unknown, record: Unit) => (
        <Space>
          <Button
            type="text"
            size="small"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
            title="Редактировать"
          />
          <Popconfirm
            title="Удалить единицу измерения?"
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
    <div className="modern-page-container units-page">
      <div className="modern-page-header">
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div className="modern-page-title">
            <div className="modern-page-icon units">
              <ColumnHeightOutlined />
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
                Единицы измерения
              </Title>
              <div style={{ color: '#64748b', fontSize: 14, marginTop: 4 }}>
                Справочник единиц измерения материалов
              </div>
            </div>
          </div>
          <Button
            type="primary"
            size="large"
            className="modern-add-button units"
            icon={<PlusOutlined />}
            onClick={handleAdd}
          >
            Добавить единицу
          </Button>
        </div>
      </div>

      <div className="modern-page-content">
        <Table
          className="modern-table"
          columns={columns}
          dataSource={units}
          loading={isLoading}
          rowKey="id"
          size="middle"
          pagination={{
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) =>
              `${range[0]}-${range[1]} из ${total} записей`,
            pageSizeOptions: ['10', '20', '50', '100'],
            defaultPageSize: 20,
            position: ['topRight', 'bottomRight'],
          }}
          scroll={{
            x: 'max-content',
            y: 'calc(100vh - 400px)',
          }}
          sticky
        />
      </div>

      <Modal
        title={
          editingUnit
            ? 'Редактировать единицу измерения'
            : 'Добавить единицу измерения'
        }
        open={isModalOpen}
        onOk={handleSubmit}
        onCancel={handleCloseModal}
        confirmLoading={createMutation.isPending || updateMutation.isPending}
        width={600}
      >
        <Form form={form} layout="vertical" initialValues={{ is_active: true }}>
          <Form.Item
            name="name"
            label="Наименование"
            rules={[
              { required: true, message: 'Пожалуйста, введите наименование' },
              { max: 100, message: 'Максимальная длина 100 символов' },
            ]}
          >
            <Input placeholder="Введите полное наименование единицы измерения" />
          </Form.Item>

          <Form.Item
            name="short_name"
            label="Сокращение"
            rules={[
              { required: true, message: 'Пожалуйста, введите сокращение' },
              { max: 20, message: 'Максимальная длина 20 символов' },
            ]}
          >
            <Input placeholder="Введите краткое обозначение" />
          </Form.Item>

          <Form.Item
            name="description"
            label="Описание"
            rules={[{ max: 500, message: 'Максимальная длина 500 символов' }]}
          >
            <Input.TextArea
              rows={3}
              placeholder="Введите описание единицы измерения (необязательно)"
            />
          </Form.Item>

          <Form.Item
            name="is_active"
            label="Активность"
            valuePropName="checked"
          >
            <Switch checkedChildren="Активен" unCheckedChildren="Неактивен" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

export default UnitsReference
