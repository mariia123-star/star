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
  DatePicker,
  InputNumber,
  Switch,
  message,
  Popconfirm,
  Tag,
} from 'antd'
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  FolderOutlined,
} from '@ant-design/icons'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  projectsApi,
  Project,
  CreateProjectData,
  UpdateProjectData,
} from '@/shared/api/projects'
import { usersApi, User } from '@/entities/users'
import dayjs from 'dayjs'

const { Title } = Typography

interface ProjectFormData {
  name: string
  description?: string
  start_date?: string
  end_date?: string
  status: string
  budget?: number
  responsible_person?: string
  is_active: boolean
}

const statusOptions = [
  { value: 'планируется', label: 'Планируется', color: 'blue' },
  { value: 'в_работе', label: 'В работе', color: 'green' },
  { value: 'завершен', label: 'Завершен', color: 'default' },
  { value: 'приостановлен', label: 'Приостановлен', color: 'orange' },
]

function Projects() {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingProject, setEditingProject] = useState<Project | null>(null)
  const [form] = Form.useForm<ProjectFormData>()

  const queryClient = useQueryClient()

  const { data: projects = [], isLoading } = useQuery({
    queryKey: ['projects'],
    queryFn: projectsApi.getAll,
  })

  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: usersApi.getActiveUsers,
  })

  console.log('Projects page rendered', {
    action: 'page_render',
    timestamp: new Date().toISOString(),
    projectsCount: projects.length,
    usersCount: users.length,
  })

  const createMutation = useMutation({
    mutationFn: projectsApi.create,
    onSuccess: data => {
      console.log('Project created successfully:', data)
      queryClient.invalidateQueries({ queryKey: ['projects'] })
      message.success('Проект успешно создан')
      handleCloseModal()
    },
    onError: error => {
      console.error('Create error details:', {
        error,
        message: error.message,
        timestamp: new Date().toISOString(),
      })
      message.error(`Ошибка при создании проекта: ${error.message}`)
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateProjectData }) =>
      projectsApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] })
      message.success('Проект успешно обновлен')
      handleCloseModal()
    },
    onError: error => {
      console.error('Update error:', error)
      message.error('Ошибка при обновлении проекта')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: projectsApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] })
      message.success('Проект успешно удален')
    },
    onError: error => {
      console.error('Delete error:', error)
      message.error('Ошибка при удалении проекта')
    },
  })

  const handleAdd = () => {
    console.log('Add project clicked', {
      action: 'add_project',
      timestamp: new Date().toISOString(),
    })

    setEditingProject(null)
    form.resetFields()
    form.setFieldsValue({ is_active: true, status: 'планируется' })
    setIsModalOpen(true)
  }

  const handleEdit = (project: Project) => {
    console.log('Edit project clicked', {
      action: 'edit_project',
      projectId: project.id,
      projectName: project.name,
      timestamp: new Date().toISOString(),
    })

    setEditingProject(project)
    form.setFieldsValue({
      ...project,
      start_date: project.start_date
        ? dayjs(project.start_date).format('YYYY-MM-DD')
        : undefined,
      end_date: project.end_date
        ? dayjs(project.end_date).format('YYYY-MM-DD')
        : undefined,
    })
    setIsModalOpen(true)
  }

  const handleDelete = (id: string) => {
    console.log('Delete project clicked', {
      action: 'delete_project',
      projectId: id,
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
    setEditingProject(null)
    form.resetFields()
  }

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields()

      console.log('Form submitted', {
        action: 'form_submit',
        values,
        editingProject: editingProject?.id,
        timestamp: new Date().toISOString(),
      })

      const formattedData = {
        ...values,
        start_date: values.start_date
          ? dayjs(values.start_date).format('YYYY-MM-DD')
          : undefined,
        end_date: values.end_date
          ? dayjs(values.end_date).format('YYYY-MM-DD')
          : undefined,
      }

      console.log('Formatted data to send:', {
        action: 'data_format',
        formattedData,
        timestamp: new Date().toISOString(),
      })

      if (editingProject) {
        updateMutation.mutate({
          id: editingProject.id,
          data: formattedData,
        })
      } else {
        createMutation.mutate(formattedData as CreateProjectData)
      }
    } catch (error) {
      console.error('Form validation error:', error)
      message.error('Ошибка валидации формы')
    }
  }

  const formatCurrency = (value?: number) => {
    if (!value) return '—'
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: 'RUB',
    }).format(value)
  }

  const getStatusConfig = (status: string) => {
    return (
      statusOptions.find(option => option.value === status) || statusOptions[0]
    )
  }

  const getUserName = (userId?: string) => {
    if (!userId) return '—'
    const user = users.find(u => u.id === userId)
    return user ? user.full_name : '—'
  }

  const columns = [
    {
      title: 'Название проекта',
      dataIndex: 'name',
      key: 'name',
      sorter: (a: Project, b: Project) => a.name.localeCompare(b.name),
      ellipsis: true,
    },
    {
      title: 'Статус',
      dataIndex: 'status',
      key: 'status',
      width: 140,
      render: (status: string) => {
        const config = getStatusConfig(status)
        return <Tag color={config.color}>{config.label}</Tag>
      },
      sorter: (a: Project, b: Project) => a.status.localeCompare(b.status),
    },
    {
      title: 'Ответственный',
      dataIndex: 'responsible_person',
      key: 'responsible_person',
      width: 200,
      render: (userId: string | null) => getUserName(userId || undefined),
      sorter: (a: Project, b: Project) => {
        const userA =
          users.find(u => u.id === a.responsible_person)?.full_name || ''
        const userB =
          users.find(u => u.id === b.responsible_person)?.full_name || ''
        return userA.localeCompare(userB)
      },
    },
    {
      title: 'Бюджет',
      dataIndex: 'budget',
      key: 'budget',
      width: 140,
      align: 'right' as const,
      render: (value: number | null) => formatCurrency(value || undefined),
      sorter: (a: Project, b: Project) => (a.budget || 0) - (b.budget || 0),
    },
    {
      title: 'Период',
      key: 'period',
      width: 200,
      render: (_: unknown, record: Project) => {
        const start = record.start_date
          ? dayjs(record.start_date).format('DD.MM.YYYY')
          : '—'
        const end = record.end_date
          ? dayjs(record.end_date).format('DD.MM.YYYY')
          : '—'
        return `${start} — ${end}`
      },
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
      render: (_: unknown, record: Project) => (
        <Space>
          <Button
            type="text"
            size="small"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
            title="Редактировать"
          />
          <Popconfirm
            title="Удалить проект?"
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
    <div className="modern-page-container projects-page">
      <div className="modern-page-header">
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div className="modern-page-title">
            <div className="modern-page-icon projects">
              <FolderOutlined />
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
                Проекты
              </Title>
              <div style={{ color: '#64748b', fontSize: 14, marginTop: 4 }}>
                Управление проектами и задачами
              </div>
            </div>
          </div>
          <Button
            type="primary"
            size="large"
            className="modern-add-button projects"
            icon={<PlusOutlined />}
            onClick={handleAdd}
          >
            Добавить проект
          </Button>
        </div>
      </div>

      <div className="modern-page-content">
        <Table
          className="modern-table"
          columns={columns}
          dataSource={projects}
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
        title={editingProject ? 'Редактировать проект' : 'Добавить проект'}
        open={isModalOpen}
        onOk={handleSubmit}
        onCancel={handleCloseModal}
        confirmLoading={createMutation.isPending || updateMutation.isPending}
        width={800}
      >
        <Form
          form={form}
          layout="vertical"
          initialValues={{ is_active: true, status: 'планируется' }}
        >
          <Form.Item
            name="name"
            label="Название проекта"
            rules={[
              {
                required: true,
                message: 'Пожалуйста, введите название проекта',
              },
              { max: 300, message: 'Максимальная длина 300 символов' },
            ]}
          >
            <Input placeholder="Введите название проекта" />
          </Form.Item>

          <Form.Item name="description" label="Описание">
            <Input.TextArea
              rows={3}
              placeholder="Введите описание проекта (необязательно)"
            />
          </Form.Item>

          <div style={{ display: 'flex', gap: 16 }}>
            <Form.Item
              name="start_date"
              label="Дата начала"
              style={{ flex: 1 }}
            >
              <DatePicker
                style={{ width: '100%' }}
                placeholder="Выберите дату начала"
                format="DD.MM.YYYY"
              />
            </Form.Item>
            <Form.Item
              name="end_date"
              label="Дата окончания"
              style={{ flex: 1 }}
            >
              <DatePicker
                style={{ width: '100%' }}
                placeholder="Выберите дату окончания"
                format="DD.MM.YYYY"
              />
            </Form.Item>
          </div>

          <div style={{ display: 'flex', gap: 16 }}>
            <Form.Item
              name="status"
              label="Статус"
              rules={[
                { required: true, message: 'Пожалуйста, выберите статус' },
              ]}
              style={{ flex: 1 }}
            >
              <Select placeholder="Выберите статус">
                {statusOptions.map(option => (
                  <Select.Option key={option.value} value={option.value}>
                    <Tag color={option.color}>{option.label}</Tag>
                  </Select.Option>
                ))}
              </Select>
            </Form.Item>
            <Form.Item name="budget" label="Бюджет" style={{ flex: 1 }}>
              <InputNumber
                style={{ width: '100%' }}
                placeholder="0.00"
                precision={2}
                min={0}
                addonAfter="₽"
              />
            </Form.Item>
          </div>

          <Form.Item name="responsible_person" label="Ответственный">
            <Select
              placeholder="Выберите ответственного"
              allowClear
              showSearch
              filterOption={(input, option) => {
                const user = users.find(u => u.id === option?.value) as User
                if (!user) return false
                return user.full_name
                  .toLowerCase()
                  .includes(input.toLowerCase())
              }}
            >
              {users.map(user => (
                <Select.Option key={user.id} value={user.id}>
                  {user.full_name} ({user.role})
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

export default Projects
