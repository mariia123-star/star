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
  Row,
  Col,
  Card,
  InputNumber,
  Upload,
} from 'antd'
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  SearchOutlined,
  FileExcelOutlined,
  UploadOutlined,
  AppstoreOutlined,
} from '@ant-design/icons'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  materialsApi,
  MaterialUpdate,
  MaterialWithUnit,
  MaterialImportRow,
  MATERIAL_CATEGORY_OPTIONS,
} from '@/entities/materials'
import { unitsApi } from '@/entities/units'
import * as XLSX from 'xlsx'

const { Title } = Typography
const { Search } = Input

interface MaterialFormData {
  code: string
  name: string
  description?: string
  category: string
  unit_id: string
  last_purchase_price?: number
  supplier?: string
  supplier_article?: string
  is_active: boolean
}

// Убираем дублирующий интерфейс - используем MaterialImportRow из types

function Materials() {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isImportModalOpen, setIsImportModalOpen] = useState(false)
  const [editingMaterial, setEditingMaterial] =
    useState<MaterialWithUnit | null>(null)
  const [form] = Form.useForm<MaterialFormData>()
  const [searchText, setSearchText] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<string>()
  const [importData, setImportData] = useState<MaterialImportRow[]>([])
  const [isImporting, setIsImporting] = useState(false)

  const queryClient = useQueryClient()

  const { data: materials = [], isLoading, error: materialsError } = useQuery({
    queryKey: ['materials'],
    queryFn: materialsApi.getAll,
  })

  const { data: units = [], error: unitsError } = useQuery({
    queryKey: ['units'],
    queryFn: unitsApi.getAll,
  })

  console.log('Materials page rendered', {
    action: 'page_render',
    timestamp: new Date().toISOString(),
    materialsCount: materials.length,
    unitsCount: units.length,
    isLoading,
    materialsError: materialsError?.message,
    unitsError: unitsError?.message,
  })

  // Детальное логирование данных
  if (materials.length > 0) {
    console.log('Materials data sample:', materials.slice(0, 2))
  }
  if (units.length > 0) {
    console.log('Units data sample:', units.slice(0, 2))
  }

  const createMutation = useMutation({
    mutationFn: materialsApi.create,
    onSuccess: data => {
      console.log('Material created successfully:', data)
      queryClient.invalidateQueries({ queryKey: ['materials'] })
      message.success('Материал успешно создан')
      handleCloseModal()
    },
    onError: error => {
      console.error('Create error details:', {
        error,
        message: error.message,
        timestamp: new Date().toISOString(),
      })
      message.error(`Ошибка при создании материала: ${error.message}`)
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: MaterialUpdate }) =>
      materialsApi.update(id, data),
    onSuccess: data => {
      console.log('Material updated successfully:', data)
      queryClient.invalidateQueries({ queryKey: ['materials'] })
      message.success('Материал успешно обновлен')
      handleCloseModal()
    },
    onError: error => {
      console.error('Update error details:', {
        error,
        message: error.message,
        timestamp: new Date().toISOString(),
      })
      message.error(`Ошибка при обновлении материала: ${error.message}`)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: materialsApi.delete,
    onSuccess: () => {
      console.log('Material deleted successfully')
      queryClient.invalidateQueries({ queryKey: ['materials'] })
      message.success('Материал успешно удален')
    },
    onError: error => {
      console.error('Delete error details:', {
        error,
        message: error.message,
        timestamp: new Date().toISOString(),
      })
      message.error(`Ошибка при удалении материала: ${error.message}`)
    },
  })

  const bulkImportMutation = useMutation({
    mutationFn: materialsApi.bulkImport,
    onSuccess: data => {
      console.log('Bulk import completed successfully:', data)
      queryClient.invalidateQueries({ queryKey: ['materials'] })
      message.success(`Успешно импортировано ${data.length} материалов`)
      handleCloseImportModal()
    },
    onError: error => {
      console.error('Bulk import error details:', {
        error,
        message: error.message,
        timestamp: new Date().toISOString(),
      })
      message.error(`Ошибка при импорте: ${error.message}`)
    },
  })

  const handleAdd = () => {
    console.log('Add material clicked', {
      action: 'add_material',
      timestamp: new Date().toISOString(),
    })

    setEditingMaterial(null)
    form.resetFields()
    form.setFieldsValue({
      is_active: true,
      category: MATERIAL_CATEGORY_OPTIONS[0].value,
    })
    setIsModalOpen(true)
  }

  const handleEdit = (material: MaterialWithUnit) => {
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

    deleteMutation.mutate(id)
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

  const handleCloseImportModal = () => {
    console.log('Import modal closed', {
      action: 'import_modal_close',
      timestamp: new Date().toISOString(),
    })

    setIsImportModalOpen(false)
    setImportData([])
    setIsImporting(false)
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
        updateMutation.mutate({
          id: editingMaterial.id,
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

  const handleSearch = (value: string) => {
    console.log('Search triggered', {
      action: 'search',
      searchText: value,
      timestamp: new Date().toISOString(),
    })
    setSearchText(value)
  }

  const handleCategoryFilter = (category: string) => {
    console.log('Category filter changed', {
      action: 'filter_category',
      category,
      timestamp: new Date().toISOString(),
    })
    setCategoryFilter(category)
  }

  const handleImportClick = () => {
    console.log('Import Excel clicked', {
      action: 'import_excel',
      timestamp: new Date().toISOString(),
    })
    setIsImportModalOpen(true)
  }

  // eslint-disable-next-line no-undef
  const handleFileUpload = (file: File): boolean => {
    console.log('File upload started', {
      action: 'file_upload_start',
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
      timestamp: new Date().toISOString(),
    })

    // Проверка типа файла
    const allowedTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
      'application/vnd.ms-excel', // .xls
    ]
    
    if (!allowedTypes.includes(file.type) && !file.name.match(/\.(xlsx|xls)$/i)) {
      console.error('Invalid file type:', {
        fileName: file.name,
        fileType: file.type,
        allowedTypes,
      })
      message.error('Пожалуйста, выберите файл в формате Excel (.xlsx или .xls)')
      return false
    }

    // Проверка размера файла (максимум 10MB)
    const maxFileSize = 10 * 1024 * 1024 // 10MB в байтах
    if (file.size > maxFileSize) {
      console.error('File too large:', {
        fileName: file.name,
        fileSize: file.size,
        maxFileSize,
      })
      message.error('Размер файла не должен превышать 10MB')
      return false
    }

    // eslint-disable-next-line no-undef
    const reader = new FileReader()
    
    reader.onerror = () => {
      console.error('FileReader error:', reader.error)
      message.error('Ошибка при чтении файла')
    }
    
    reader.onload = e => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer)
        const workbook = XLSX.read(data, { type: 'array' })
        const sheetName = workbook.SheetNames[0]
        const worksheet = workbook.Sheets[sheetName]
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 })

        // Парсинг данных Excel с улучшенной валидацией
        const parsedData: MaterialImportRow[] = []
        const errors: string[] = []

        console.log('Excel file structure:', {
          sheetName,
          totalRows: jsonData.length,
          firstRowData: jsonData[0],
          timestamp: new Date().toISOString(),
        })

        for (let i = 1; i < jsonData.length; i++) {
          const row = jsonData[i] as (string | number)[]
          if (row.length === 0) continue

          try {
            const rowData: MaterialImportRow = {
              code: String(row[0] || '').trim(),
              name: String(row[1] || '').trim(),
              description: row[2] ? String(row[2]).trim() : undefined,
              category: String(row[3] || 'other').trim(),
              unit_name: String(row[4] || '').trim(),
              last_purchase_price:
                typeof row[5] === 'number' ? row[5] : 
                typeof row[5] === 'string' && !isNaN(Number(row[5])) ? Number(row[5]) : undefined,
              supplier: row[6] ? String(row[6]).trim() : undefined,
              supplier_article: row[7] ? String(row[7]).trim() : undefined,
            }

            // Валидация обязательных полей
            if (!rowData.code) {
              errors.push(`Строка ${i + 1}: отсутствует код материала`)
              continue
            }
            if (!rowData.name) {
              errors.push(`Строка ${i + 1}: отсутствует наименование материала`)
              continue
            }
            if (!rowData.unit_name) {
              errors.push(`Строка ${i + 1}: отсутствует единица измерения`)
              continue
            }

            // Валидация категории
            const validCategories = MATERIAL_CATEGORY_OPTIONS.map(opt => opt.value)
            if (!validCategories.includes(rowData.category as any)) {
              console.warn(`Строка ${i + 1}: неизвестная категория '${rowData.category}', использована 'other'`)
              rowData.category = 'other'
            }

            parsedData.push(rowData)
          } catch (error) {
            errors.push(`Строка ${i + 1}: ошибка парсинга - ${error}`)
            console.error(`Row ${i + 1} parsing error:`, error)
          }
        }

        // Показываем ошибки если есть
        if (errors.length > 0) {
          console.error('Excel parsing errors:', errors)
          message.warning(
            `Обнаружены ошибки в ${errors.length} строках. Проверьте консоль для подробностей.`
          )
        }

        setImportData(parsedData)
        console.log('Excel parsed successfully', {
          action: 'excel_parsed',
          rowCount: parsedData.length,
          timestamp: new Date().toISOString(),
        })
        message.success(`Обработано ${parsedData.length} строк из Excel`)
      } catch (error) {
        console.error('Excel parsing error:', {
          error,
          fileName: file.name,
          errorMessage: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString(),
        })
        
        let errorMessage = 'Ошибка при обработке Excel файла'
        if (error instanceof Error) {
          if (error.message.includes('Unsupported file')) {
            errorMessage = 'Неподдерживаемый формат файла. Используйте .xlsx или .xls'
          } else if (error.message.includes('Invalid workbook')) {
            errorMessage = 'Файл поврежден или имеет неверный формат'
          } else {
            errorMessage = `Ошибка обработки: ${error.message}`
          }
        }
        
        message.error(errorMessage)
        setImportData([])
      }
    }
    reader.readAsArrayBuffer(file)
    return false // Предотвращаем автоматическую загрузку
  }

  const handleImport = () => {
    console.log('Import started', {
      action: 'import_start',
      itemCount: importData.length,
      importDataSample: importData.slice(0, 3), // Первые 3 записи для отладки
      timestamp: new Date().toISOString(),
    })

    if (importData.length === 0) {
      console.error('Import attempted with empty data')
      message.error('Нет данных для импорта')
      return
    }

    // Валидация каждого элемента перед отправкой
    const invalidItems = importData.filter(
      item => !item.code || !item.name || !item.unit_name
    )
    
    if (invalidItems.length > 0) {
      console.error('Invalid items found:', invalidItems)
      message.error(
        `Обнаружены некорректные данные в ${invalidItems.length} записях. Проверьте код, название и единицу измерения.`
      )
      return
    }

    setIsImporting(true)
    bulkImportMutation.mutate(importData)
  }

  const getCategoryConfig = (category: string) => {
    return (
      MATERIAL_CATEGORY_OPTIONS.find(option => option.value === category) ||
      MATERIAL_CATEGORY_OPTIONS[MATERIAL_CATEGORY_OPTIONS.length - 1]
    )
  }

  const filteredMaterials = materials.filter(material => {
    const matchesSearch =
      !searchText ||
      material.code.toLowerCase().includes(searchText.toLowerCase()) ||
      material.name.toLowerCase().includes(searchText.toLowerCase())

    const matchesCategory =
      !categoryFilter || material.category === categoryFilter

    return matchesSearch && matchesCategory
  })

  const columns = [
    {
      title: 'Код',
      dataIndex: 'code',
      key: 'code',
      width: 120,
      sorter: (a: MaterialWithUnit, b: MaterialWithUnit) =>
        a.code.localeCompare(b.code),
      ellipsis: true,
    },
    {
      title: 'Наименование',
      dataIndex: 'name',
      key: 'name',
      sorter: (a: MaterialWithUnit, b: MaterialWithUnit) =>
        a.name.localeCompare(b.name),
      ellipsis: true,
    },
    {
      title: 'Описание',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
      render: (description: string) => description || '-',
    },
    {
      title: 'Категория',
      dataIndex: 'category',
      key: 'category',
      width: 180,
      render: (category: string) => {
        const config = getCategoryConfig(category)
        return <Tag color={config.color}>{config.label}</Tag>
      },
      sorter: (a: MaterialWithUnit, b: MaterialWithUnit) =>
        a.category.localeCompare(b.category),
    },
    {
      title: 'Ед. изм.',
      dataIndex: 'unit_short_name',
      key: 'unit_short_name',
      width: 80,
      sorter: (a: MaterialWithUnit, b: MaterialWithUnit) =>
        a.unit_short_name.localeCompare(b.unit_short_name),
    },
    {
      title: 'Последняя цена',
      dataIndex: 'last_purchase_price',
      key: 'last_purchase_price',
      width: 120,
      render: (price: number) => (price ? `${price.toFixed(2)} ₽` : '-'),
      sorter: (a: MaterialWithUnit, b: MaterialWithUnit) =>
        (a.last_purchase_price || 0) - (b.last_purchase_price || 0),
    },
    {
      title: 'Поставщик',
      dataIndex: 'supplier',
      key: 'supplier',
      ellipsis: true,
      render: (supplier: string) => supplier || '-',
      sorter: (a: MaterialWithUnit, b: MaterialWithUnit) =>
        (a.supplier || '').localeCompare(b.supplier || ''),
    },
    {
      title: 'Артикул',
      dataIndex: 'supplier_article',
      key: 'supplier_article',
      width: 120,
      ellipsis: true,
      render: (article: string) => article || '-',
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
      sorter: (a: MaterialWithUnit, b: MaterialWithUnit) =>
        Number(a.is_active) - Number(b.is_active),
    },
    {
      title: 'Дата создания',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 140,
      render: (date: string) => new Date(date).toLocaleDateString('ru-RU'),
      sorter: (a: MaterialWithUnit, b: MaterialWithUnit) =>
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
    },
    {
      title: 'Действия',
      key: 'actions',
      width: 120,
      render: (_: unknown, record: MaterialWithUnit) => (
        <Space>
          <Button
            type="text"
            size="small"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
            title="Редактировать"
          />
          <Popconfirm
            title="Удалить материал?"
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
    <div className="modern-page-container materials-page">
      <div className="modern-page-header">
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 24,
          }}
        >
          <div className="modern-page-title">
            <div className="modern-page-icon rates">
              <AppstoreOutlined />
            </div>
            <div>
              <Title level={2} style={{ margin: 0, color: '#1a1a1a', fontSize: 28, fontWeight: 700 }}>
                Сборник материалов
              </Title>
              <div style={{ color: '#64748b', fontSize: 14, marginTop: 4 }}>
                Каталог строительных материалов и их характеристики
              </div>
            </div>
          </div>
          <Space size={12}>
            <Button
              size="large"
              icon={<FileExcelOutlined />}
              onClick={handleImportClick}
              style={{
                borderRadius: 10,
                height: 44,
                borderColor: '#10b981',
                color: '#10b981',
                fontWeight: 600,
              }}
            >
              Импорт из Excel
            </Button>
            <Button 
              type="primary" 
              size="large"
              className="modern-add-button rates"
              icon={<PlusOutlined />} 
              onClick={handleAdd}
            >
              Добавить материал
            </Button>
          </Space>
        </div>

        <Card size="small" style={{
          background: '#f8fafc',
          border: '1px solid #e2e8f0',
          borderRadius: 12
        }}>
          <Row gutter={[16, 16]}>
            <Col xs={24} sm={12} md={8} lg={6}>
              <Search
                placeholder="Поиск по коду или названию"
                allowClear
                onSearch={handleSearch}
                onChange={e => e.target.value === '' && setSearchText('')}
                prefix={<SearchOutlined />}
              />
            </Col>
            <Col xs={24} sm={12} md={8} lg={6}>
              <Select
                placeholder="Категория"
                allowClear
                showSearch
                value={categoryFilter}
                onChange={handleCategoryFilter}
                filterOption={(input, option) => {
                  const text =
                    (option?.children || option?.label)?.toString() || ''
                  return text.toLowerCase().includes(input.toLowerCase())
                }}
                style={{ width: '100%' }}
              >
                {MATERIAL_CATEGORY_OPTIONS.map(category => (
                  <Select.Option key={category.value} value={category.value}>
                    <Tag color={category.color}>{category.label}</Tag>
                  </Select.Option>
                ))}
              </Select>
            </Col>
          </Row>
        </Card>
      </div>

      <div className="modern-page-content">
        {materialsError && (
          <div style={{ padding: 16, textAlign: 'center', color: '#ff4d4f' }}>
            Ошибка загрузки материалов: {materialsError.message}
          </div>
        )}
        {unitsError && (
          <div style={{ padding: 16, textAlign: 'center', color: '#ff4d4f' }}>
            Ошибка загрузки единиц измерения: {unitsError.message}
          </div>
        )}
        <Table
          className="modern-table"
          columns={columns}
          dataSource={filteredMaterials}
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

      {/* Модальное окно редактирования/создания */}
      <Modal
        title={editingMaterial ? 'Редактировать материал' : 'Добавить материал'}
        open={isModalOpen}
        onOk={handleSubmit}
        onCancel={handleCloseModal}
        confirmLoading={createMutation.isPending || updateMutation.isPending}
        width={800}
      >
        <Form
          form={form}
          layout="vertical"
          initialValues={{
            is_active: true,
            category: MATERIAL_CATEGORY_OPTIONS[0].value,
          }}
        >
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="code"
                label="Код материала"
                rules={[
                  {
                    required: true,
                    message: 'Пожалуйста, введите код материала',
                  },
                  { max: 50, message: 'Максимальная длина 50 символов' },
                ]}
              >
                <Input placeholder="Например: МТ-001" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="unit_id"
                label="Единица измерения"
                rules={[
                  {
                    required: true,
                    message: 'Пожалуйста, выберите единицу измерения',
                  },
                ]}
              >
                <Select
                  placeholder="Выберите единицу измерения"
                  allowClear
                  showSearch
                  filterOption={(input, option) => {
                    const text =
                      (option?.children || option?.label)?.toString() || ''
                    return text.toLowerCase().includes(input.toLowerCase())
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
          </Row>

          <Form.Item
            name="name"
            label="Наименование"
            rules={[
              { required: true, message: 'Пожалуйста, введите наименование' },
              { max: 500, message: 'Максимальная длина 500 символов' },
            ]}
          >
            <Input placeholder="Наименование материала" />
          </Form.Item>

          <Form.Item
            name="description"
            label="Описание"
            rules={[{ max: 1000, message: 'Максимальная длина 1000 символов' }]}
          >
            <Input.TextArea
              rows={3}
              placeholder="Подробное описание материала"
            />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="category"
                label="Категория"
                rules={[
                  { required: true, message: 'Пожалуйста, выберите категорию' },
                ]}
              >
                <Select placeholder="Выберите категорию">
                  {MATERIAL_CATEGORY_OPTIONS.map(category => (
                    <Select.Option key={category.value} value={category.value}>
                      <Tag color={category.color}>{category.label}</Tag>
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="last_purchase_price"
                label="Последняя цена (₽)"
                rules={[
                  {
                    type: 'number',
                    min: 0,
                    message: 'Цена не может быть отрицательной',
                  },
                ]}
              >
                <InputNumber
                  style={{ width: '100%' }}
                  placeholder="0.00"
                  precision={2}
                  min={0}
                  step={0.01}
                />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="supplier"
                label="Поставщик"
                rules={[
                  { max: 255, message: 'Максимальная длина 255 символов' },
                ]}
              >
                <Input placeholder="Поставщик (опционально)" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="supplier_article"
                label="Артикул поставщика"
                rules={[
                  { max: 100, message: 'Максимальная длина 100 символов' },
                ]}
              >
                <Input placeholder="Артикул (опционально)" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="is_active"
            label="Активность"
            valuePropName="checked"
          >
            <Switch checkedChildren="Активен" unCheckedChildren="Неактивен" />
          </Form.Item>
        </Form>
      </Modal>

      {/* Модальное окно импорта Excel */}
      <Modal
        title="Импорт материалов из Excel"
        open={isImportModalOpen}
        onCancel={() => {
          console.log('Import modal cancel clicked', {
            action: 'import_modal_cancel',
            importDataCount: importData.length,
            timestamp: new Date().toISOString(),
          })
          handleCloseImportModal()
        }}
        footer={[
          <Button key="cancel" onClick={handleCloseImportModal}>
            Отмена
          </Button>,
          <Button
            key="import"
            type="primary"
            loading={isImporting || bulkImportMutation.isPending}
            disabled={importData.length === 0}
            onClick={handleImport}
          >
            Импортировать ({importData.length})
          </Button>,
        ]}
        width={1000}
      >
        <div style={{ marginBottom: 16 }}>
          <Upload
            accept=".xlsx,.xls"
            beforeUpload={(file) => {
              console.log('Upload beforeUpload triggered', {
                fileName: file.name,
                fileType: file.type,
                fileSize: file.size,
                timestamp: new Date().toISOString(),
              })
              return handleFileUpload(file)
            }}
            showUploadList={false}
            multiple={false}
            maxCount={1}
          >
            <Button icon={<UploadOutlined />}>Выберите Excel файл</Button>
          </Upload>
          <div style={{ marginTop: 8, color: '#666', fontSize: '12px' }}>
            Формат: Код | Наименование | Описание | Категория | Единица
            измерения | Цена | Поставщик | Артикул
          </div>
        </div>

        {importData.length > 0 && (
          <Table
            size="small"
            dataSource={importData}
            rowKey={(record, index) => `${record.code}_${index}`}
            pagination={{ pageSize: 10 }}
            columns={[
              { title: 'Код', dataIndex: 'code', width: 100 },
              { title: 'Наименование', dataIndex: 'name', ellipsis: true },
              {
                title: 'Категория',
                dataIndex: 'category',
                width: 150,
                render: (category: string) => {
                  const config = getCategoryConfig(category)
                  return <Tag color={config.color}>{config.label}</Tag>
                },
              },
              { title: 'Ед. изм.', dataIndex: 'unit_name', width: 80 },
              {
                title: 'Цена',
                dataIndex: 'last_purchase_price',
                width: 100,
                render: (price: number) =>
                  price ? `${price.toFixed(2)} ₽` : '-',
              },
            ]}
          />
        )}
      </Modal>
    </div>
  )
}

export default Materials
