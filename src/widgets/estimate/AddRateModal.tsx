import React, { useState, useEffect } from 'react'
import {
  Modal,
  Form,
  Input,
  InputNumber,
  Select,
  Row,
  Col,
  Button,
  Space,
  App,
  Steps,
  Card,
  Divider,
  Empty,
  AutoComplete,
  Typography,
} from 'antd'
import {
  PlusOutlined,
  DeleteOutlined,
  SearchOutlined,
  DatabaseOutlined,
} from '@ant-design/icons'
import { RateGroup, RatePosition } from '@/shared/types/estimate'
import { useQuery } from '@tanstack/react-query'
import { materialsApi } from '@/entities/materials'
import { unitsApi } from '@/entities/units'

const { Option } = Select
const { Step } = Steps
const { Text } = Typography

interface AddRateModalProps {
  visible: boolean
  onCancel: () => void
  onSave: (group: RateGroup) => void
}

interface MaterialData {
  materialType?: string
  name?: string
  unit?: string
  volume?: number
  consumptionRate?: number
  materialPrice?: number
  deliveryPrice?: number
}

interface FormData {
  contractor: Partial<RatePosition>
  works: Partial<RatePosition>[]
  materials: MaterialData[]
}

export default function AddRateModal({
  visible,
  onCancel,
  onSave,
}: AddRateModalProps) {
  const { message } = App.useApp()
  const [form] = Form.useForm()
  const [currentStep, setCurrentStep] = useState(0)
  const [formData, setFormData] = useState<FormData>({
    contractor: {},
    works: [{}],
    materials: [],
  })
  const [tempMaterials, setTempMaterials] = useState<MaterialData[]>([])
  const [showCatalog, setShowCatalog] = useState(false)
  const [selectedCatalogMaterial, setSelectedCatalogMaterial] = useState<
    string | null
  >(null)
  const [editingCatalogMaterial, setEditingCatalogMaterial] = useState<MaterialData | null>(null)

  // Загружаем материалы из справочника
  const { data: materials = [], isLoading: materialsLoading } = useQuery({
    queryKey: ['materials'],
    queryFn: materialsApi.getAll,
    enabled: visible, // Загружаем только когда модальное окно открыто
  })

  // Загружаем единицы измерения
  const { data: units = [], isLoading: unitsLoading } = useQuery({
    queryKey: ['units'],
    queryFn: unitsApi.getAll,
    enabled: visible,
  })

  const generateId = () =>
    `rate-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

  const handleNext = async () => {
    try {
      await form.validateFields()
      const values = form.getFieldsValue()

      if (currentStep === 0) {
        // Сохраняем данные заказчика
        setFormData(prev => ({
          ...prev,
          contractor: values,
        }))
        setCurrentStep(1)
        form.resetFields()
      } else if (currentStep === 1) {
        // Сохраняем данные работ
        setFormData(prev => ({
          ...prev,
          works: [values],
        }))
        setCurrentStep(2)
        form.resetFields()
      }
    } catch (error) {
      console.log('Validation error:', error)
    }
  }

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleSave = async () => {
    console.log('AddRateModal: handleSave called with formData:', formData)
    console.log('AddRateModal: tempMaterials:', tempMaterials)

    const contractorId = generateId()
    const workId = generateId()

    // Создаем заказчика
    const contractor: RatePosition = {
      id: contractorId,
      type: 'Заказчик',
      name: formData.contractor.name || 'Новый заказчик',
      unit: formData.contractor.unit || 'компл',
      volume: formData.contractor.volume || 1,
      consumptionRate: 1,
      workPrice: 0,
      materialPrice: 0,
      deliveryPrice: 0,
      total: 0,
      groupId: contractorId,
    }

    // Создаем работы
    const work: RatePosition = {
      id: workId,
      type: 'раб',
      name: formData.works[0].name || 'Новая работа',
      unit: formData.works[0].unit || 'м²',
      volume: formData.works[0].volume || 1,
      consumptionRate: 1,
      workPrice: formData.works[0].workPrice || 0,
      materialPrice: 0,
      deliveryPrice: 0,
      total:
        (formData.works[0].volume || 1) * (formData.works[0].workPrice || 0),
      groupId: contractorId,
    }

    // Создаем материалы из сохраненного списка
    const materials: RatePosition[] = tempMaterials.map((mat, index) => {
      const materialId = generateId()
      const volume = mat.volume || 1
      const consumptionRate = mat.consumptionRate || 1
      const materialPrice = mat.materialPrice || 0
      const deliveryPrice = mat.deliveryPrice || 0
      const total = volume * materialPrice * consumptionRate + deliveryPrice

      return {
        id: materialId,
        type: 'мат' as const,
        materialType: mat.materialType || 'Основной',
        name: mat.name || `Материал ${index + 1}`,
        unit: mat.unit || 'м²',
        volume: volume,
        consumptionRate: consumptionRate,
        workPrice: 0,
        materialPrice: materialPrice,
        deliveryPrice: deliveryPrice,
        total: total,
        groupId: contractorId,
      }
    })

    const materialTotal = materials.reduce((sum, mat) => sum + mat.total, 0)

    // Создаем группу
    const newGroup: RateGroup = {
      id: contractorId,
      contractor,
      works: [work],
      materials,
      totalSum: work.total + materialTotal,
      isExpanded: true,
    }

    console.log('AddRateModal: calling onSave with newGroup:', newGroup)
    onSave(newGroup)

    const hasMaterials = materials.length > 0
    message.success(
      `Новая группа расценок добавлена${hasMaterials ? ` с ${materials.length} материалами` : ' (только работы)'}`
    )
    handleClose()
  }

  const handleAddMaterial = async () => {
    try {
      const values = await form.validateFields()

      // Добавляем материал в список
      const newMaterial: MaterialData = {
        materialType: values.materialType || 'Основной',
        name: values.name,
        unit: values.unit || 'м²',
        volume: values.volume || 1,
        consumptionRate: values.consumptionRate || 1,
        materialPrice: values.materialPrice || 0,
        deliveryPrice: values.deliveryPrice || 0,
      }

      setTempMaterials(prev => [...prev, newMaterial])

      // Очищаем форму для следующего материала
      form.resetFields()
      form.setFieldsValue({
        materialType: 'Основной',
        volume: 1,
        consumptionRate: 1,
      })

      message.success(`Материал "${newMaterial.name}" добавлен в список`)
    } catch (error) {
      console.log('Validation error:', error)
      message.error('Заполните обязательные поля материала')
    }
  }

  const handleRemoveMaterial = (index: number) => {
    setTempMaterials(prev => prev.filter((_, i) => i !== index))
    message.info('Материал удален из списка')
  }

  const handleSelectFromCatalog = () => {
    if (!selectedCatalogMaterial) {
      message.warning('Выберите материал из справочника')
      return
    }

    const material = materials.find(m => m.id === selectedCatalogMaterial)
    if (!material) return

    // Проверяем, не добавлен ли уже этот материал
    const isAlreadyAdded = tempMaterials.some(m => m.name === material.name)
    if (isAlreadyAdded) {
      message.warning('Этот материал уже добавлен')
      return
    }

    // Подготавливаем данные материала для редактирования
    const materialData: MaterialData = {
      materialType: 'Основной',
      name: material.name,
      unit: material.unit_short_name || 'ед',
      volume: 1,
      consumptionRate: 1,
      materialPrice: material.last_purchase_price || 0,
      deliveryPrice: 0,
    }

    // Заполняем форму данными материала для редактирования
    setEditingCatalogMaterial(materialData)
    form.setFieldsValue(materialData)
    setSelectedCatalogMaterial(null)
    setShowCatalog(false)
    message.info(`Настройте параметры материала "${material.name}"`)
  }

  const handleAddEditedCatalogMaterial = async () => {
    try {
      const values = await form.validateFields()

      // Добавляем отредактированный материал в список
      const newMaterial: MaterialData = {
        ...editingCatalogMaterial,
        ...values
      }

      setTempMaterials(prev => [...prev, newMaterial])
      setEditingCatalogMaterial(null)

      // Очищаем форму для следующего материала
      form.resetFields()
      form.setFieldsValue({
        materialType: 'Основной',
        volume: 1,
        consumptionRate: 1,
      })

      message.success(`Материал "${newMaterial.name}" добавлен с вашими параметрами`)
    } catch (error) {
      console.log('Validation error:', error)
      message.error('Заполните обязательные поля материала')
    }
  }

  const handleClose = () => {
    setCurrentStep(0)
    setFormData({
      contractor: {},
      works: [{}],
      materials: [],
    })
    setTempMaterials([])
    setShowCatalog(false)
    setSelectedCatalogMaterial(null)
    setEditingCatalogMaterial(null)
    form.resetFields()
    onCancel()
  }

  const steps = [
    {
      title: 'Заказчик',
      description: 'Основная позиция',
    },
    {
      title: 'Работы',
      description: 'Трудозатраты',
    },
    {
      title: 'Материалы',
      description: 'Расходные материалы (опционально)',
    },
  ]

  return (
    <Modal
      title="Добавление новой группы расценок"
      open={visible}
      onCancel={handleClose}
      width={800}
      footer={null}
    >
      <Steps current={currentStep} style={{ marginBottom: 24 }}>
        {steps.map((step, index) => (
          <Step key={index} title={step.title} description={step.description} />
        ))}
      </Steps>

      <Form
        form={form}
        layout="vertical"
        initialValues={
          currentStep === 0
            ? formData.contractor
            : currentStep === 1
              ? formData.works[0]
              : formData.materials[0]
        }
      >
        {currentStep === 0 && (
          <>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  label="Наименование работ"
                  name="name"
                  rules={[{ required: true, message: 'Введите наименование' }]}
                >
                  <Input placeholder="Например: Демонтаж стен толщиной 200мм" />
                </Form.Item>
              </Col>
              <Col span={6}>
                <Form.Item
                  label="Единица измерения"
                  name="unit"
                  rules={[{ required: true, message: 'Выберите единицу' }]}
                >
                  <Select placeholder="Выберите">
                    <Option value="м³">м³</Option>
                    <Option value="м²">м²</Option>
                    <Option value="м">м</Option>
                    <Option value="т">т</Option>
                    <Option value="кг">кг</Option>
                    <Option value="шт">шт</Option>
                    <Option value="компл">компл</Option>
                  </Select>
                </Form.Item>
              </Col>
              <Col span={6}>
                <Form.Item
                  label="Объем"
                  name="volume"
                  rules={[{ required: true, message: 'Введите объем' }]}
                >
                  <InputNumber
                    min={0}
                    step={0.01}
                    placeholder="0"
                    style={{ width: '100%' }}
                  />
                </Form.Item>
              </Col>
            </Row>
          </>
        )}

        {currentStep === 1 && (
          <>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  label="Наименование работ"
                  name="name"
                  rules={[
                    { required: true, message: 'Введите наименование работ' },
                  ]}
                >
                  <Input placeholder="Например: Демонтаж стен" />
                </Form.Item>
              </Col>
              <Col span={6}>
                <Form.Item
                  label="Единица измерения"
                  name="unit"
                  rules={[{ required: true, message: 'Выберите единицу' }]}
                >
                  <Select placeholder="Выберите">
                    <Option value="м³">м³</Option>
                    <Option value="м²">м²</Option>
                    <Option value="м">м</Option>
                    <Option value="час">час</Option>
                    <Option value="смена">смена</Option>
                  </Select>
                </Form.Item>
              </Col>
              <Col span={6}>
                <Form.Item
                  label="Объем"
                  name="volume"
                  rules={[{ required: true, message: 'Введите объем' }]}
                >
                  <InputNumber
                    min={0}
                    step={0.01}
                    placeholder="0"
                    style={{ width: '100%' }}
                  />
                </Form.Item>
              </Col>
            </Row>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  label="Цена работ за единицу, руб."
                  name="workPrice"
                  rules={[{ required: true, message: 'Введите цену работ' }]}
                >
                  <InputNumber
                    min={0}
                    step={0.01}
                    placeholder="0.00"
                    style={{ width: '100%' }}
                  />
                </Form.Item>
              </Col>
            </Row>
          </>
        )}

        {currentStep === 2 && (
          <>
            {/* Список добавленных материалов */}
            {tempMaterials.length > 0 && (
              <>
                <Divider orientation="left">
                  Добавленные материалы ({tempMaterials.length})
                </Divider>
                <div
                  style={{
                    maxHeight: '200px',
                    overflowY: 'auto',
                    marginBottom: '20px',
                  }}
                >
                  {tempMaterials.map((material, index) => (
                    <Card
                      key={index}
                      size="small"
                      style={{ marginBottom: '8px' }}
                      extra={
                        <Button
                          type="text"
                          danger
                          icon={<DeleteOutlined />}
                          onClick={() => handleRemoveMaterial(index)}
                          size="small"
                        />
                      }
                    >
                      <Row gutter={16}>
                        <Col span={8}>
                          <div>
                            <strong>{material.name}</strong>
                          </div>
                          <div style={{ fontSize: '12px', color: '#666' }}>
                            {material.materialType}
                          </div>
                        </Col>
                        <Col span={4}>
                          <div style={{ fontSize: '12px', color: '#666' }}>
                            Ед. изм.
                          </div>
                          <div>{material.unit}</div>
                        </Col>
                        <Col span={4}>
                          <div style={{ fontSize: '12px', color: '#666' }}>
                            Объем
                          </div>
                          <div>{material.volume}</div>
                        </Col>
                        <Col span={4}>
                          <div style={{ fontSize: '12px', color: '#666' }}>
                            Расход
                          </div>
                          <div>{material.consumptionRate}</div>
                        </Col>
                        <Col span={4}>
                          <div style={{ fontSize: '12px', color: '#666' }}>
                            Цена
                          </div>
                          <div>{material.materialPrice} ₽</div>
                        </Col>
                      </Row>
                    </Card>
                  ))}
                </div>
              </>
            )}

            {/* Кнопки для добавления материалов */}
            <Divider orientation="left">Добавить материалы</Divider>

            <Row gutter={16} style={{ marginBottom: '20px' }}>
              <Col span={12}>
                <Button
                  type="primary"
                  icon={<DatabaseOutlined />}
                  onClick={() => setShowCatalog(!showCatalog)}
                  style={{ width: '100%' }}
                  loading={materialsLoading}
                >
                  Выбрать из справочника материалов
                </Button>
              </Col>
              <Col span={12}>
                <Button
                  type="default"
                  icon={<PlusOutlined />}
                  onClick={() => setShowCatalog(false)}
                  style={{ width: '100%' }}
                >
                  Создать новый материал
                </Button>
              </Col>
            </Row>

            {/* Выбор из справочника */}
            {showCatalog && (
              <>
                <Card
                  style={{ marginBottom: '20px', backgroundColor: '#f0f2f5' }}
                >
                  <Row gutter={16}>
                    <Col span={18}>
                      <Select
                        showSearch
                        style={{ width: '100%' }}
                        placeholder="🔍 Поиск и выбор материала из справочника"
                        optionFilterProp="children"
                        value={selectedCatalogMaterial}
                        onChange={setSelectedCatalogMaterial}
                        filterOption={(input, option) => {
                          const label =
                            option?.label?.toString().toLowerCase() || ''
                          return label.includes(input.toLowerCase())
                        }}
                        options={materials.map(material => ({
                          value: material.id,
                          label: `${material.code} - ${material.name} (${material.unit_short_name}) - ${material.last_purchase_price || 0} ₽`,
                        }))}
                        notFoundContent={
                          materialsLoading
                            ? 'Загрузка...'
                            : 'Материалы не найдены'
                        }
                      />
                    </Col>
                    <Col span={6}>
                      <Button
                        type="primary"
                        icon={<PlusOutlined />}
                        onClick={handleSelectFromCatalog}
                        disabled={!selectedCatalogMaterial}
                        style={{ width: '100%' }}
                      >
                        Выбрать и настроить
                      </Button>
                    </Col>
                  </Row>
                  {materials.length > 0 && (
                    <div
                      style={{
                        marginTop: '10px',
                        fontSize: '12px',
                        color: '#666',
                      }}
                    >
                      <Text type="secondary">
                        Доступно материалов в справочнике: {materials.length}
                      </Text>
                    </div>
                  )}
                </Card>
              </>
            )}

            {/* Форма добавления нового материала или редактирования из справочника */}
            {!showCatalog && (
              <>
                {editingCatalogMaterial && (
                  <Card
                    style={{ marginBottom: '16px', backgroundColor: '#e6f7ff' }}
                    extra={
                      <Button
                        size="small"
                        type="text"
                        danger
                        onClick={() => {
                          setEditingCatalogMaterial(null)
                          form.resetFields()
                          message.info('Редактирование отменено')
                        }}
                      >
                        Отменить
                      </Button>
                    }
                  >
                    <Text type="secondary">Настройте параметры материала из справочника:</Text>
                    <br />
                    <Text strong>{editingCatalogMaterial.name}</Text>
                  </Card>
                )}
                <Row gutter={16}>
                  <Col span={8}>
                    <Form.Item
                      label="Тип материала"
                      name="materialType"
                      initialValue="Основной"
                    >
                      <Select placeholder="Выберите">
                        <Option value="Основной">Основной</Option>
                        <Option value="Вспом">Вспомогательный</Option>
                      </Select>
                    </Form.Item>
                  </Col>
                  <Col span={16}>
                    <Form.Item
                      label="Наименование материала"
                      name="name"
                      rules={[
                        {
                          required: true,
                          message: 'Введите наименование материала',
                        },
                      ]}
                    >
                      <Input
                        placeholder="Например: Арматура А500С"
                        disabled={!!editingCatalogMaterial}
                      />
                    </Form.Item>
                  </Col>
                </Row>
                <Row gutter={16}>
                  <Col span={6}>
                    <Form.Item
                      label="Единица измерения"
                      name="unit"
                      initialValue="м²"
                    >
                      <Select
                        placeholder="Выберите"
                        disabled={!!editingCatalogMaterial}
                      >
                        <Option value="т">т</Option>
                        <Option value="кг">кг</Option>
                        <Option value="м³">м³</Option>
                        <Option value="м²">м²</Option>
                        <Option value="м">м</Option>
                        <Option value="шт">шт</Option>
                      </Select>
                    </Form.Item>
                  </Col>
                  <Col span={6}>
                    <Form.Item label="Объем" name="volume" initialValue={1}>
                      <InputNumber
                        min={0}
                        step={0.01}
                        placeholder="0"
                        style={{ width: '100%' }}
                      />
                    </Form.Item>
                  </Col>
                  <Col span={6}>
                    <Form.Item
                      label="Коэф. расхода"
                      name="consumptionRate"
                      initialValue={1}
                    >
                      <InputNumber
                        min={0}
                        step={0.01}
                        placeholder="1.00"
                        style={{ width: '100%' }}
                      />
                    </Form.Item>
                  </Col>
                  <Col span={6}>
                    <Form.Item
                      label="Цена материала, руб."
                      name="materialPrice"
                      rules={[{ required: true, message: 'Введите цену' }]}
                    >
                      <InputNumber
                        min={0}
                        step={0.01}
                        placeholder="0.00"
                        style={{ width: '100%' }}
                      />
                    </Form.Item>
                  </Col>
                </Row>
                <Row gutter={16}>
                  <Col span={12}>
                    <Form.Item
                      label="Доставка материала, руб."
                      name="deliveryPrice"
                      initialValue={0}
                    >
                      <InputNumber
                        min={0}
                        step={0.01}
                        placeholder="0.00"
                        style={{ width: '100%' }}
                      />
                    </Form.Item>
                  </Col>
                </Row>

                {/* Кнопка добавления материала в список */}
                <Button
                  type={editingCatalogMaterial ? "primary" : "dashed"}
                  onClick={editingCatalogMaterial ? handleAddEditedCatalogMaterial : handleAddMaterial}
                  icon={<PlusOutlined />}
                  style={{ width: '100%', marginBottom: '16px' }}
                >
                  {editingCatalogMaterial
                    ? `Добавить "${editingCatalogMaterial.name}" с новыми параметрами`
                    : 'Добавить материал в список'}
                </Button>
              </>
            )}

            {tempMaterials.length === 0 && !showCatalog && (
              <Empty
                description="Материалы не добавлены"
                style={{ padding: '20px 0' }}
              >
                <div
                  style={{ fontSize: '12px', color: '#666', marginTop: '8px' }}
                >
                  Выберите материалы из справочника или создайте новые
                </div>
              </Empty>
            )}
          </>
        )}
      </Form>

      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          marginTop: 24,
        }}
      >
        <div>
          {currentStep > 0 && <Button onClick={handlePrevious}>Назад</Button>}
        </div>
        <Space>
          <Button onClick={handleClose}>Отмена</Button>
          {currentStep === 1 && (
            <Button
              onClick={() => {
                // Переходим сразу к сохранению, пропуская материалы
                setCurrentStep(2)
                setTimeout(() => handleSave(), 100)
              }}
            >
              Пропустить материалы
            </Button>
          )}
          {currentStep < 2 ? (
            <Button type="primary" onClick={handleNext}>
              Далее
            </Button>
          ) : (
            <>
              {tempMaterials.length === 0 && (
                <Button onClick={handleSave}>Создать без материалов</Button>
              )}
              {tempMaterials.length > 0 && (
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  onClick={handleSave}
                >
                  Создать группу с {tempMaterials.length} материал
                  {tempMaterials.length === 1 ? 'ом' : 'ами'}
                </Button>
              )}
            </>
          )}
        </Space>
      </div>
    </Modal>
  )
}
