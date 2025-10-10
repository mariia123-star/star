import { useState } from 'react'
import {
  Table,
  Button,
  Space,
  Typography,
  Modal,
  Form,
  Input,
  message,
  Popconfirm,
} from 'antd'
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  TagsOutlined,
} from '@ant-design/icons'
import { materialTypesData } from '@/entities/material-types'

const { Title } = Typography

interface MaterialType {
  id: string
  name: string
  short_name: string
}

interface MaterialFormData {
  name: string
  short_name: string
}

function MaterialTypes() {
  const [materialTypes, setMaterialTypes] =
    useState<MaterialType[]>(materialTypesData)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingMaterial, setEditingMaterial] = useState<MaterialType | null>(
    null
  )
  const [form] = Form.useForm<MaterialFormData>()

  console.log('MaterialTypes component rendered', {
    action: 'component_render',
    timestamp: new Date().toISOString(),
    materialTypesCount: materialTypes.length,
  })

  const handleEdit = (material: MaterialType) => {
    console.log('Edit material clicked', {
      action: 'edit_material',
      materialId: material.id,
      materialName: material.name,
      timestamp: new Date().toISOString(),
    })

    setEditingMaterial(material)
    form.setFieldsValue(material)
    setIsModalOpen(true)
  }

  const handleDelete = (id: string) => {
    console.log('Delete material clicked', {
      action: 'delete_material',
      materialId: id,
      timestamp: new Date().toISOString(),
    })

    setMaterialTypes(prev => prev.filter(item => item.id !== id))
    message.success('Тип материала успешно удален')
  }

  const handleCloseModal = () => {
    console.log('Modal closed', {
      action: 'modal_close',
      timestamp: new Date().toISOString(),
    })

    setIsModalOpen(false)
    setEditingMaterial(null)
    form.resetFields()
  }

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields()

      console.log('Form submitted', {
        action: 'form_submit',
        values,
        editingMaterial: editingMaterial?.id,
        timestamp: new Date().toISOString(),
      })

      if (editingMaterial) {
        setMaterialTypes(prev =>
          prev.map(item =>
            item.id === editingMaterial.id ? { ...item, ...values } : item
          )
        )
        message.success('Тип материала успешно обновлен')
      }

      handleCloseModal()
    } catch (error) {
      console.error('Form validation error:', error)
    }
  }

  const columns = [
    {
      title: 'Наименование',
      dataIndex: 'name',
      key: 'name',
      sorter: (a: MaterialType, b: MaterialType) =>
        a.name.localeCompare(b.name),
    },
    {
      title: 'Сокращение',
      dataIndex: 'short_name',
      key: 'short_name',
      width: 150,
    },
    {
      title: 'Действия',
      key: 'actions',
      width: 120,
      render: (_: unknown, record: MaterialType) => (
        <Space>
          <Button
            type="text"
            size="small"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
            title="Редактировать"
          />
          <Popconfirm
            title="Удалить тип материала?"
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
    <div className="modern-page-container material-types-page">
      <div className="modern-page-header">
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div className="modern-page-title">
            <div className="modern-page-icon material-types">
              <TagsOutlined />
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
                Типы материалов
              </Title>
              <div style={{ color: '#64748b', fontSize: 14, marginTop: 4 }}>
                Классификация типов материалов
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="modern-page-content">
        <Table
          className="modern-table"
          columns={columns}
          dataSource={materialTypes}
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
        title="Редактировать тип материала"
        open={isModalOpen}
        onOk={handleSubmit}
        onCancel={handleCloseModal}
        width={600}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="name"
            label="Наименование"
            rules={[
              { required: true, message: 'Пожалуйста, введите наименование' },
              { max: 100, message: 'Максимальная длина 100 символов' },
            ]}
          >
            <Input placeholder="Введите наименование типа материала" />
          </Form.Item>

          <Form.Item
            name="short_name"
            label="Сокращение"
            rules={[
              { required: true, message: 'Пожалуйста, введите сокращение' },
              { max: 20, message: 'Максимальная длина 20 символов' },
            ]}
          >
            <Input placeholder="Введите сокращение" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

export default MaterialTypes
