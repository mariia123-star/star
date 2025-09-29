import { useState } from 'react'
import { Card, Button, Typography, Space, Statistic, Row, Col, App, Select } from 'antd'
import {
  PlusOutlined,
  CalculatorOutlined,
  FileTextOutlined,
  DownloadOutlined,
  SaveOutlined
} from '@ant-design/icons'
import { RateGroup, RatePosition, RATE_COLORS } from '@/shared/types/estimate'
import RateBlock from './RateBlock'
import AddRateModal from './AddRateModal'
import { tenderEstimatesApi } from '@/entities/tender-estimates'
import { unitsApi } from '@/entities/units'
import { projectsApi } from '@/shared/api/projects'
import { useQuery } from '@tanstack/react-query'

const { Title, Text } = Typography

interface RateConsoleProps {
  onAddNew?: () => void
}

// Утилитарные функции для расчетов
// const calculatePositionTotal = (position: RatePosition): number => {
//   const worksCost = position.volume * position.workPrice
//   const materialsCost = position.volume * position.materialPrice * position.consumptionRate
//   const deliveryCost = position.deliveryPrice
//   return worksCost + materialsCost + deliveryCost
// }

const calculateGroupTotal = (group: RateGroup): number => {
  const worksCost = group.works.reduce((sum, work) => sum + work.total, 0)
  const materialsCost = group.materials.reduce((sum, material) => sum + material.total, 0)
  return worksCost + materialsCost
}

const getTotalCost = (groups: RateGroup[]): number => {
  return groups.reduce((total, group) => total + group.totalSum, 0)
}

const formatCurrency = (amount: number): string => {
  return amount.toLocaleString('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  })
}

// Тестовые данные
const generateTestData = (): RateGroup[] => [
  {
    id: 'group-1',
    contractor: {
      id: 'contractor-1',
      type: 'Заказчик',
      name: 'Демонтаж стен толщиной 200мм',
      unit: 'м³',
      volume: 17.2,
      consumptionRate: 1,
      workPrice: 3200,
      materialPrice: 0,
      deliveryPrice: 0,
      total: 55040,
      groupId: 'group-1'
    },
    works: [
      {
        id: 'work-1-1',
        type: 'раб',
        name: 'Демонтаж стен толщиной 200мм',
        unit: 'м³',
        volume: 17.2,
        consumptionRate: 1,
        workPrice: 3200,
        materialPrice: 0,
        deliveryPrice: 0,
        total: 55040,
        groupId: 'group-1'
      }
    ],
    materials: [
      {
        id: 'material-1-1',
        type: 'мат',
        materialType: 'Основной',
        name: 'Арматура',
        unit: 'т',
        volume: 0.64,
        consumptionRate: 1.05,
        workPrice: 0,
        materialPrice: 10000,
        deliveryPrice: 0,
        total: 6720,
        groupId: 'group-1'
      },
      {
        id: 'material-1-2',
        type: 'мат',
        materialType: 'Вспом',
        name: 'Крепеж',
        unit: 'м',
        volume: 12.04,
        consumptionRate: 1,
        workPrice: 0,
        materialPrice: 500,
        deliveryPrice: 0,
        total: 6020,
        groupId: 'group-1'
      }
    ],
    totalSum: 67780,
    isExpanded: true
  },
  {
    id: 'group-2',
    contractor: {
      id: 'contractor-2',
      type: 'Заказчик',
      name: 'Устройство железобетонного фундамента',
      unit: 'м³',
      volume: 25.5,
      consumptionRate: 1,
      workPrice: 4500,
      materialPrice: 0,
      deliveryPrice: 0,
      total: 114750,
      groupId: 'group-2'
    },
    works: [
      {
        id: 'work-2-1',
        type: 'раб',
        name: 'Устройство опалубки',
        unit: 'м²',
        volume: 85.0,
        consumptionRate: 1,
        workPrice: 850,
        materialPrice: 0,
        deliveryPrice: 0,
        total: 72250,
        groupId: 'group-2'
      },
      {
        id: 'work-2-2',
        type: 'раб',
        name: 'Заливка бетона',
        unit: 'м³',
        volume: 25.5,
        consumptionRate: 1,
        workPrice: 1650,
        materialPrice: 0,
        deliveryPrice: 0,
        total: 42075,
        groupId: 'group-2'
      }
    ],
    materials: [
      {
        id: 'material-2-1',
        type: 'мат',
        materialType: 'Основной',
        name: 'Бетон B25',
        unit: 'м³',
        volume: 25.5,
        consumptionRate: 1.05,
        workPrice: 0,
        materialPrice: 5500,
        deliveryPrice: 275,
        total: 154613,
        groupId: 'group-2'
      }
    ],
    totalSum: 268938,
    isExpanded: false
  }
]

export default function RateConsole({ onAddNew: _onAddNew }: RateConsoleProps) {
  const { message } = App.useApp()
  const [groups, setGroups] = useState<RateGroup[]>(generateTestData)
  const [isAddModalVisible, setIsAddModalVisible] = useState(false)
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null)
  const [exportingGroup, setExportingGroup] = useState<string | null>(null)

  // Загружаем данные для экспорта
  const { data: units = [] } = useQuery({
    queryKey: ['units'],
    queryFn: unitsApi.getAll,
  })

  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: projectsApi.getAll,
  })

  const handleEdit = (groupId: string) => {
    message.info(`Редактирование группы ${groupId}`)
    console.log('🔧 Edit group:', groupId)
  }

  const handleDelete = (groupId: string) => {
    message.success(`Группа расценок удалена`)
    setGroups(prev => prev.filter(group => group.id !== groupId))
    console.log('🗑️ Delete group:', groupId)
  }

  const handleDuplicate = (groupId: string) => {
    const groupToDuplicate = groups.find(g => g.id === groupId)
    if (groupToDuplicate) {
      const newGroup: RateGroup = {
        ...groupToDuplicate,
        id: `${groupId}-copy-${Date.now()}`,
        contractor: {
          ...groupToDuplicate.contractor,
          id: `${groupToDuplicate.contractor.id}-copy`,
          name: `${groupToDuplicate.contractor.name} (копия)`
        },
        works: groupToDuplicate.works.map(work => ({
          ...work,
          id: `${work.id}-copy`
        })),
        materials: groupToDuplicate.materials.map(material => ({
          ...material,
          id: `${material.id}-copy`
        }))
      }
      setGroups(prev => [...prev, newGroup])
      message.success('Группа расценок дублирована')
      console.log('📋 Duplicate group:', groupId)
    }
  }

  const handleUpdatePosition = (positionId: string, updates: Partial<RatePosition>) => {
    setGroups(prev => {
      return prev.map(group => {
        // Обновляем заказчика
        if (group.contractor.id === positionId) {
          const updatedContractor = { ...group.contractor, ...updates }
          return {
            ...group,
            contractor: updatedContractor,
            totalSum: calculateGroupTotal({
              ...group,
              contractor: updatedContractor
            })
          }
        }

        // Обновляем работы
        const updatedWorks = group.works.map(work =>
          work.id === positionId ? { ...work, ...updates } : work
        )

        // Обновляем материалы
        const updatedMaterials = group.materials.map(material =>
          material.id === positionId ? { ...material, ...updates } : material
        )

        // Если что-то изменилось, пересчитываем итог
        if (updatedWorks !== group.works || updatedMaterials !== group.materials) {
          return {
            ...group,
            works: updatedWorks,
            materials: updatedMaterials,
            totalSum: calculateGroupTotal({
              ...group,
              works: updatedWorks,
              materials: updatedMaterials
            })
          }
        }

        return group
      })
    })

    message.success('Позиция обновлена')
    console.log('✏️ Position updated:', { positionId, updates })
  }

  const handleAddNew = () => {
    setIsAddModalVisible(true)
    console.log('➕ Add new group modal opened')
  }

  const handleSaveNewGroup = (newGroup: RateGroup) => {
    setGroups(prev => [...prev, newGroup])
    setIsAddModalVisible(false)
    console.log('✨ New group added:', newGroup)
  }

  // Функция сохранения всех расценок в смету
  const handleSaveAllToEstimate = async () => {
    if (!selectedProjectId) {
      message.error('Сначала выберите проект для сохранения')
      return
    }

    if (groups.length === 0) {
      message.warning('Нет расценок для сохранения')
      return
    }

    setExportingGroup('all')
    console.log('💾 Сохранение всех расценок в смету...')

    try {
      let totalSuccess = 0
      let totalErrors = 0

      for (const group of groups) {
        // Используем существующую функцию экспорта для каждой группы
        try {
          // Создаем запись подрядчика
          const contractorRecord = {
            materials: '',
            works: group.contractor.name,
            quantity: group.contractor.volume,
            unit_id: findUnitId(group.contractor.unit) || units[0]?.id,
            unit_price: 0,
            total_price: group.contractor.total,
            notes: 'Заказчик',
            material_type: null,
            coefficient: 1,
            work_price: 0,
            material_price: 0,
            delivery_cost: 0,
            record_type: 'contractor' as const,
            project_id: selectedProjectId
          }

          await tenderEstimatesApi.create(contractorRecord)
          totalSuccess++

          // Сохраняем работы
          for (const work of group.works) {
            const workRecord = {
              materials: '',
              works: work.name,
              quantity: work.volume,
              unit_id: findUnitId(work.unit) || units[0]?.id,
              unit_price: work.workPrice,
              total_price: work.total,
              notes: 'Работа',
              material_type: null,
              coefficient: work.consumptionRate,
              work_price: work.workPrice,
              material_price: 0,
              delivery_cost: 0,
              record_type: 'work' as const,
              project_id: selectedProjectId
            }
            await tenderEstimatesApi.create(workRecord)
            totalSuccess++
          }

          // Сохраняем материалы
          for (const material of group.materials) {
            const materialRecord = {
              materials: material.name,
              works: '',
              quantity: material.volume,
              unit_id: findUnitId(material.unit) || units[0]?.id,
              unit_price: material.materialPrice,
              total_price: material.total,
              notes: `Материал: ${material.materialType}`,
              material_type: material.materialType,
              coefficient: material.consumptionRate,
              work_price: 0,
              material_price: material.materialPrice,
              delivery_cost: material.deliveryPrice,
              record_type: 'material' as const,
              project_id: selectedProjectId
            }
            await tenderEstimatesApi.create(materialRecord)
            totalSuccess++
          }
        } catch (error) {
          console.error('Ошибка сохранения группы:', error)
          totalErrors++
        }
      }

      if (totalSuccess > 0) {
        message.success(`Все расценки сохранены: ${totalSuccess} записей добавлено`)
        console.log('✅ Сохранение завершено:', { totalSuccess, totalErrors })
      } else {
        message.error('Не удалось сохранить ни одной записи')
      }

    } catch (error) {
      console.error('Ошибка сохранения всех расценок:', error)
      message.error(`Ошибка сохранения: ${error}`)
    } finally {
      setExportingGroup(null)
    }
  }

  // Функция экспорта группы расценок в смету
  const handleExportToEstimate = async (groupId: string) => {
    console.log('🔄 Экспорт группы в смету:', groupId)

    if (!selectedProjectId) {
      message.error('Сначала выберите проект для экспорта')
      return
    }

    const group = groups.find(g => g.id === groupId)
    if (!group) {
      message.error('Группа расценок не найдена')
      return
    }

    setExportingGroup(groupId)

    try {
      const defaultUnit = units.find(u => u.short_name === 'м²') || units[0]
      if (!defaultUnit) {
        throw new Error('Нет доступных единиц измерения')
      }

      // Создаем записи для экспорта в формате тендерной сметы
      const estimateRecords = []

      // 1. Запись заказчика (основная позиция)
      const contractorRecord = {
        materials: '',
        works: group.contractor.name,
        quantity: group.contractor.volume,
        unit_id: findUnitId(group.contractor.unit) || defaultUnit.id,
        unit_price: 0, // Для заказчика цена = 0
        total_price: group.totalSum,
        notes: `Экспорт из консоли расценок - ${new Date().toLocaleString()}`,
        material_type: undefined,
        coefficient: 1,
        work_price: 0,
        material_price: 0,
        delivery_cost: 0,
        record_type: 'summary' as const,
        project_id: selectedProjectId
      }
      estimateRecords.push(contractorRecord)

      // 2. Записи работ
      for (const work of group.works) {
        const workRecord = {
          materials: '',
          works: work.name,
          quantity: work.volume,
          unit_id: findUnitId(work.unit) || defaultUnit.id,
          unit_price: work.workPrice,
          total_price: work.total,
          notes: 'Работы из консоли расценок',
          material_type: undefined,
          coefficient: work.consumptionRate,
          work_price: work.workPrice,
          material_price: 0,
          delivery_cost: 0,
          record_type: 'work' as const,
          project_id: selectedProjectId
        }
        estimateRecords.push(workRecord)
      }

      // 3. Записи материалов
      for (const material of group.materials) {
        const materialRecord = {
          materials: material.name,
          works: '',
          quantity: material.volume,
          unit_id: findUnitId(material.unit) || defaultUnit.id,
          unit_price: material.materialPrice,
          total_price: material.total,
          notes: `Материал: ${material.materialType}`,
          material_type: material.materialType,
          coefficient: material.consumptionRate,
          work_price: 0,
          material_price: material.materialPrice,
          delivery_cost: material.deliveryPrice,
          record_type: 'material' as const,
          project_id: selectedProjectId
        }
        estimateRecords.push(materialRecord)
      }

      // Сохраняем все записи в базу данных
      console.log('💾 Сохранение записей в смету:', estimateRecords.length)
      let successCount = 0
      let errorCount = 0

      for (const record of estimateRecords) {
        try {
          await tenderEstimatesApi.create(record)
          successCount++
        } catch (error) {
          console.error('Ошибка сохранения записи:', error, record)
          errorCount++
        }
      }

      if (successCount > 0) {
        message.success(`Группа расценок экспортирована в смету: ${successCount} записей добавлено`)
        console.log('✅ Экспорт завершен:', { successCount, errorCount })
      } else {
        message.error('Не удалось экспортировать ни одной записи')
      }

    } catch (error) {
      console.error('Ошибка экспорта в смету:', error)
      message.error(`Ошибка экспорта: ${error}`)
    } finally {
      setExportingGroup(null)
    }
  }

  // Вспомогательная функция для поиска ID единицы измерения
  const findUnitId = (unitName: string): string | null => {
    const unit = units.find(u =>
      u.short_name === unitName ||
      u.name.toLowerCase().includes(unitName.toLowerCase())
    )
    return unit?.id || null
  }

  const totalCost = getTotalCost(groups)
  const totalWorksCost = groups.reduce((sum, group) =>
    sum + group.works.reduce((workSum, work) => workSum + work.total, 0), 0
  )
  const totalMaterialsCost = groups.reduce((sum, group) =>
    sum + group.materials.reduce((materialSum, material) => materialSum + material.total, 0), 0
  )

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '24px' }}>
      {/* Заголовок */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <Title level={2} style={{ margin: 0, color: '#1f2937' }}>
          <CalculatorOutlined style={{ marginRight: '12px' }} />
          Консоль управления расценками
        </Title>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
            <Text style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>
              Проект для экспорта:
            </Text>
            <Select
              style={{ minWidth: '200px' }}
              placeholder="Выберите проект"
              allowClear
              showSearch
              value={selectedProjectId}
              onChange={setSelectedProjectId}
              filterOption={(input, option) => {
                const project = projects.find(p => p.id === option?.value)
                return project?.name.toLowerCase().includes(input.toLowerCase()) || false
              }}
            >
              {projects.map(project => (
                <Select.Option key={project.id} value={project.id}>
                  {project.name}
                </Select.Option>
              ))}
            </Select>
          </div>
          <Button
            size="large"
            icon={<SaveOutlined />}
            onClick={() => handleSaveAllToEstimate()}
            disabled={!selectedProjectId || groups.length === 0}
            loading={exportingGroup === 'all'}
          >
            Сохранить всё
          </Button>
          <Button
            type="primary"
            size="large"
            icon={<PlusOutlined />}
            onClick={handleAddNew}
          >
            Добавить позицию
          </Button>
        </div>
      </div>

      {/* Сводная информация */}
      <Card style={{ marginBottom: '24px' }} title={
        <span>
          <FileTextOutlined style={{ marginRight: '8px' }} />
          Сводная информация по смете
        </span>
      }>
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12} md={6}>
            <Statistic
              title="Количество позиций"
              value={groups.length}
              suffix="шт"
            />
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Statistic
              title="Стоимость работ"
              value={totalWorksCost}
              formatter={(value) => formatCurrency(Number(value))}
              valueStyle={{ color: RATE_COLORS.work.background }}
            />
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Statistic
              title="Стоимость материалов"
              value={totalMaterialsCost}
              formatter={(value) => formatCurrency(Number(value))}
              valueStyle={{ color: RATE_COLORS.materialMain.background }}
            />
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Statistic
              title="Общая стоимость"
              value={totalCost}
              formatter={(value) => formatCurrency(Number(value))}
              valueStyle={{ color: '#1677ff', fontSize: '24px' }}
            />
          </Col>
        </Row>
      </Card>

      {/* Список блоков расценок */}
      <div style={{ marginBottom: '24px' }}>
        {groups.length === 0 ? (
          <Card>
            <div style={{ textAlign: 'center', padding: '40px 0' }}>
              <Text type="secondary" style={{ fontSize: '16px' }}>
                Нет добавленных расценок. Нажмите "Добавить позицию" для создания новой группы расценок.
              </Text>
            </div>
          </Card>
        ) : (
          groups.map((group) => (
            <RateBlock
              key={group.id}
              group={group}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onDuplicate={handleDuplicate}
              onUpdatePosition={handleUpdatePosition}
              onExportToEstimate={handleExportToEstimate}
              exportingGroup={exportingGroup}
              selectedProjectId={selectedProjectId}
            />
          ))
        )}
      </div>

      {/* Общий итог */}
      {groups.length > 0 && (
        <Card
          style={{
            background: '#1f2937',
            border: 'none'
          }}
          styles={{ body: { padding: '24px' } }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <Title level={3} style={{ color: 'white', margin: 0 }}>
                Общая стоимость сметы:
              </Title>
              <Text style={{ color: '#9ca3af' }}>
                {groups.length} позиций | Работы: {formatCurrency(totalWorksCost)} | Материалы: {formatCurrency(totalMaterialsCost)}
              </Text>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ color: 'white', fontSize: '32px', fontWeight: 'bold' }}>
                {formatCurrency(totalCost)}
              </div>
              <Space>
                <Button icon={<DownloadOutlined />} style={{ marginTop: '8px' }}>
                  Экспорт в Excel
                </Button>
                <Button icon={<FileTextOutlined />} style={{ marginTop: '8px' }}>
                  Печать сметы
                </Button>
              </Space>
            </div>
          </div>
        </Card>
      )}

      {/* Модальное окно добавления */}
      <AddRateModal
        visible={isAddModalVisible}
        onCancel={() => setIsAddModalVisible(false)}
        onSave={handleSaveNewGroup}
      />
    </div>
  )
}