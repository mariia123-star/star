import { useState } from 'react'
import {
  Table,
  Button,
  Space,
  Typography,
  Modal,
  Form,
  Input,
  Select,
  Switch,
  message,
  Popconfirm,
  Tag,
} from 'antd'
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  UserOutlined,
} from '@ant-design/icons'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { usersApi, User, UserUpdate } from '@/entities/users'

const { Title } = Typography

interface UserFormData {
  full_name: string
  email: string
  role: string
  is_active: boolean
}

const roleOptions = [
  { value: 'администратор', label: 'Администратор', color: 'red' },
  { value: 'инженер', label: 'Инженер', color: 'blue' },
]

function Users() {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [form] = Form.useForm<UserFormData>()

  const queryClient = useQueryClient()

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: usersApi.getAll,
  })

  console.log('Users page rendered', {
    action: 'page_render',
    timestamp: new Date().toISOString(),
    usersCount: users.length,
  })

  const createMutation = useMutation({
    mutationFn: usersApi.create,
    onSuccess: data => {
      console.log('User created successfully:', data)
      queryClient.invalidateQueries({ queryKey: ['users'] })
      message.success('Пользователь успешно создан')
      handleCloseModal()
    },
    onError: error => {
      console.error('Create error details:', {
        error,
        message: error.message,
        timestamp: new Date().toISOString(),
      })
      message.error(`Ошибка при создании пользователя: ${error.message}`)
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UserUpdate }) =>
      usersApi.update(id, data),
    onSuccess: data => {
      console.log('User updated successfully:', data)
      queryClient.invalidateQueries({ queryKey: ['users'] })
      message.success('Пользователь успешно обновлен')
      handleCloseModal()
    },
    onError: error => {
      console.error('Update error details:', {
        error,
        message: error.message,
        timestamp: new Date().toISOString(),
      })
      message.error(`Ошибка при обновлении пользователя: ${error.message}`)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: usersApi.delete,
    onSuccess: () => {
      console.log('User deleted successfully')
      queryClient.invalidateQueries({ queryKey: ['users'] })
      message.success('Пользователь успешно удален')
    },
    onError: error => {
      console.error('Delete error details:', {
        error,
        message: error.message,
        timestamp: new Date().toISOString(),
      })
      message.error(`Ошибка при удалении пользователя: ${error.message}`)
    },
  })

  const handleAdd = () => {
    console.log('Add user clicked', {
      action: 'add_user',
      timestamp: new Date().toISOString(),
    })

    setEditingUser(null)
    form.resetFields()
    form.setFieldsValue({ is_active: true, role: 'инженер' })
    setIsModalOpen(true)
  }

  const handleEdit = (user: User) => {
    console.log('Edit user clicked', {
      action: 'edit_user',
      userId: user.id,
      userName: user.full_name,
      timestamp: new Date().toISOString(),
    })

    setEditingUser(user)
    form.setFieldsValue(user)
    setIsModalOpen(true)
  }

  const handleDelete = (id: string) => {
    console.log('Delete user clicked', {
      action: 'delete_user',
      userId: id,
      timestamp: new Date().toISOString(),
    })

    deleteMutation.mutate(id)
  }

  const handleCloseModal = () => {
    console.log('Modal closed', {
      action: 'modal_close',
      timestamp: new Date().toISOString(),
    })

    setIsModalOpen(false)
    setEditingUser(null)
    form.resetFields()
  }

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields()

      console.log('Form submitted', {
        action: 'form_submit',
        values,
        editingUser: editingUser?.id,
        timestamp: new Date().toISOString(),
      })

      if (editingUser) {
        updateMutation.mutate({
          id: editingUser.id,
          data: values,
        })
      } else {
        createMutation.mutate(values)
      }
    } catch (error) {
      console.error('Form validation error:', error)
      message.error('Ошибка валидации формы')
    }
  }

  const getRoleConfig = (role: string) => {
    return roleOptions.find(option => option.value === role) || roleOptions[1]
  }

  const columns = [
    {
      title: 'ФИО',
      dataIndex: 'full_name',
      key: 'full_name',
      sorter: (a: User, b: User) => a.full_name.localeCompare(b.full_name),
      ellipsis: true,
    },
    {
      title: 'Email',
      dataIndex: 'email',
      key: 'email',
      ellipsis: true,
      sorter: (a: User, b: User) => a.email.localeCompare(b.email),
    },
    {
      title: 'Роль',
      dataIndex: 'role',
      key: 'role',
      width: 140,
      render: (role: string) => {
        const config = getRoleConfig(role)
        return <Tag color={config.color}>{config.label}</Tag>
      },
      sorter: (a: User, b: User) => a.role.localeCompare(b.role),
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
      sorter: (a: User, b: User) => Number(a.is_active) - Number(b.is_active),
    },
    {
      title: 'Дата создания',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 140,
      render: (date: string) => new Date(date).toLocaleDateString('ru-RU'),
      sorter: (a: User, b: User) =>
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
    },
    {
      title: 'Действия',
      key: 'actions',
      width: 120,
      render: (_: unknown, record: User) => (
        <Space>
          <Button
            type="text"
            size="small"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
            title="Редактировать"
          />
          <Popconfirm
            title="Удалить пользователя?"
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
    <div
      style={{
        height: 'calc(100vh - 160px)',
        display: 'flex',
        flexDirection: 'column',
        background: '#f8fafc',
      }}
    >
      <style>
        {`
          .ant-table-thead > tr > th {
            background: linear-gradient(135deg, #ec4899, #be185d) !important;
            color: #ffffff !important;
            font-weight: 600 !important;
            border: none !important;
            padding: 16px 12px !important;
            font-size: 13px !important;
          }
          .ant-table-tbody > tr > td {
            padding: 12px !important;
            border-bottom: 1px solid #f0f0f0 !important;
          }
          .ant-table-tbody > tr:hover > td {
            background: #fdf2f8 !important;
          }
        `}
      </style>
      <div
        style={{
          flexShrink: 0,
          marginBottom: 24,
          background: '#ffffff',
          borderRadius: 16,
          padding: 24,
          boxShadow: '0 2px 12px rgba(0, 0, 0, 0.06)',
          border: '1px solid #f0f2f5',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: 12,
                background: 'linear-gradient(135deg, #ec4899, #be185d)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 12px rgba(236, 72, 153, 0.3)',
              }}
            >
              <UserOutlined style={{ color: '#fff', fontSize: 20 }} />
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
                Пользователи
              </Title>
              <div style={{ color: '#64748b', fontSize: 14, marginTop: 4 }}>
                Управление пользователями системы
              </div>
            </div>
          </div>
          <Button
            type="primary"
            size="large"
            icon={<PlusOutlined />}
            onClick={handleAdd}
            style={{
              background: 'linear-gradient(135deg, #ec4899, #be185d)',
              border: 'none',
              borderRadius: 10,
              height: 44,
              fontWeight: 600,
              boxShadow: '0 4px 12px rgba(236, 72, 153, 0.3)',
            }}
          >
            Добавить пользователя
          </Button>
        </div>
      </div>

      <div
        style={{
          flex: 1,
          overflow: 'hidden',
          background: '#ffffff',
          borderRadius: 16,
          padding: 24,
          boxShadow: '0 2px 12px rgba(0, 0, 0, 0.06)',
          border: '1px solid #f0f2f5',
        }}
      >
        <Table
          columns={columns}
          dataSource={users}
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
          style={{
            borderRadius: 12,
            overflow: 'hidden',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
          }}
        />
      </div>

      <Modal
        title={
          editingUser ? 'Редактировать пользователя' : 'Добавить пользователя'
        }
        open={isModalOpen}
        onOk={handleSubmit}
        onCancel={handleCloseModal}
        confirmLoading={createMutation.isPending || updateMutation.isPending}
        width={600}
      >
        <Form
          form={form}
          layout="vertical"
          initialValues={{ is_active: true, role: 'инженер' }}
        >
          <Form.Item
            name="full_name"
            label="ФИО"
            rules={[
              {
                required: true,
                message: 'Пожалуйста, введите ФИО пользователя',
              },
              { max: 200, message: 'Максимальная длина 200 символов' },
            ]}
          >
            <Input
              placeholder="Введите полное имя пользователя"
              prefix={<UserOutlined />}
            />
          </Form.Item>

          <Form.Item
            name="email"
            label="Email"
            rules={[
              { required: true, message: 'Пожалуйста, введите email' },
              { type: 'email', message: 'Введите корректный email адрес' },
              { max: 255, message: 'Максимальная длина 255 символов' },
            ]}
          >
            <Input placeholder="Введите email адрес" type="email" />
          </Form.Item>

          <Form.Item
            name="role"
            label="Роль"
            rules={[{ required: true, message: 'Пожалуйста, выберите роль' }]}
          >
            <Select placeholder="Выберите роль пользователя">
              {roleOptions.map(option => (
                <Select.Option key={option.value} value={option.value}>
                  <Tag color={option.color}>{option.label}</Tag>
                </Select.Option>
              ))}
            </Select>
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

export default Users
