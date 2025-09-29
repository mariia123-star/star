import React, { useState } from 'react'
import {
  Button,
  Space,
  Typography,
  Modal,
  Form,
  Input,
  Select,
  Switch,
  message,
  Tag,
  Row,
  Col,
  Card,
  InputNumber,
  Tabs,
  List,
  Statistic,
  App,
} from 'antd'
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  SearchOutlined,
  BuildOutlined,
  CalculatorOutlined,
  FileTextOutlined,
  DownloadOutlined,
  ExportOutlined,
} from '@ant-design/icons'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ratesApi, RateUpdate, RateWithUnit, rateMaterialsApi, RateMaterial } from '@/entities/rates'
import { unitsApi, Unit } from '@/entities/units'
import { materialsApi, MaterialWithUnit } from '@/entities/materials'
import { supabase } from '@/lib/supabase'
import { RateGroup, RatePosition, RATE_COLORS } from '@/shared/types/estimate'
import RateBlock from '@/widgets/estimate/RateBlock'
import AddRateModal from '@/widgets/estimate/AddRateModal'

const { Title, Text } = Typography
const { Search } = Input


interface RateFormData {
  code: string
  name: string
  description?: string
  unit_id: string
  base_price: number
  category: string
  subcategory?: string
  is_active: boolean
}

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


// Функция преобразования расценок из БД в формат RateGroup
const convertRatesToGroups = (
  rates: RateWithUnit[],
  allRateMaterials: Record<string, RateMaterial[]>
): RateGroup[] => {
  return rates.map(rate => {
    const rateId = rate.id

    // Создаем заказчика (основную позицию)
    const contractor: RatePosition = {
      id: `contractor-${rateId}`,
      type: 'Заказчик',
      name: rate.name,
      unit: rate.unit_short_name || 'ед',
      volume: 1,
      consumptionRate: 1,
      workPrice: rate.base_price,
      materialPrice: 0,
      deliveryPrice: 0,
      total: rate.base_price,
      groupId: rateId
    }

    // Создаем работы (одну позицию работ)
    const work: RatePosition = {
      id: `work-${rateId}`,
      type: 'раб',
      name: rate.name,
      unit: rate.unit_short_name || 'ед',
      volume: 1,
      consumptionRate: 1,
      workPrice: rate.base_price,
      materialPrice: 0,
      deliveryPrice: 0,
      total: rate.base_price,
      groupId: rateId
    }

    // Создаем материалы
    const rateMaterials = allRateMaterials[rateId] || []
    const materials: RatePosition[] = rateMaterials.map((rateMaterial, index) => ({
      id: `material-${rateId}-${index}`,
      type: 'мат',
      materialType: rateMaterial.material?.category === 'material' ? 'Основной' : 'Вспом',
      name: rateMaterial.material?.name || 'Материал',
      unit: rateMaterial.material?.unit_short_name || 'ед',
      volume: rateMaterial.consumption || 1,
      consumptionRate: rateMaterial.consumption || 1,
      workPrice: 0,
      materialPrice: rateMaterial.unit_price || 0,
      deliveryPrice: 0,
      total: (rateMaterial.consumption || 1) * (rateMaterial.unit_price || 0),
      groupId: rateId
    }))

    // Подсчет общей стоимости
    const worksCost = rate.base_price
    const materialsCost = materials.reduce((sum, mat) => sum + mat.total, 0)
    const totalSum = worksCost + materialsCost

    return {
      id: rateId,
      contractor,
      works: [work],
      materials,
      totalSum,
      isExpanded: false
    }
  })
}

const categoryOptions = [
  {
    value: 'общестроительные_работы',
    label: 'Общестроительные работы',
    color: 'blue',
  },
  { value: 'фасадные_работы', label: 'Фасадные работы', color: 'green' },
  { value: 'благоустройство', label: 'Благоустройство', color: 'orange' },
  { value: 'монолитные_работы', label: 'Монолитные работы', color: 'purple' },
  { value: 'оборудование', label: 'Оборудование', color: 'cyan' },
  { value: 'материал', label: 'Материал', color: 'red' },
  {
    value: 'электромонтажные_работы',
    label: 'Электромонтажные работы',
    color: 'gold',
  },
  { value: 'слаботочные_работы', label: 'Слаботочные работы', color: 'lime' },
  {
    value: 'механические_работы',
    label: 'Механические работы',
    color: 'magenta',
  },
  { value: 'земляные_работы', label: 'Земляные работы', color: 'volcano' },
  {
    value: 'временные_здания_сооружения',
    label: 'Временные здания/сооружения',
    color: 'geekblue',
  },
]

function Rates() {
  const { message } = App.useApp()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isMaterialModalOpen, setIsMaterialModalOpen] = useState(false)
  const [isAddModalVisible, setIsAddModalVisible] = useState(false)
  const [editingRate, setEditingRate] = useState<RateWithUnit | null>(null)
  const [selectedRateForMaterial, setSelectedRateForMaterial] = useState<RateWithUnit | null>(null)
  const [form] = Form.useForm<RateFormData>()
  const [materialForm] = Form.useForm<MaterialFormData>()
  const [searchText, setSearchText] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<string>()
  const [rateGroups, setRateGroups] = useState<RateGroup[]>([])
  const [exportingGroup, setExportingGroup] = useState<string | null>(null)

  const queryClient = useQueryClient()

  const { data: rates = [], isLoading } = useQuery({
    queryKey: ['rates'],
    queryFn: ratesApi.getAll,
  })

  const { data: units = [], isLoading: unitsLoading } = useQuery({
    queryKey: ['units'],
    queryFn: unitsApi.getAll,
  })

  const { data: materials = [], isLoading: materialsLoading } = useQuery({
    queryKey: ['materials'],
    queryFn: materialsApi.getAll,
  })

  // Запрос всех материалов расценок для построения иерархии (оптимизированный)
  const { data: allRateMaterials = {}, isLoading: rateMaterialsLoading } = useQuery({
    queryKey: ['rateMaterials', 'all'],
    queryFn: async () => {
      // Получаем все связи материалов с расценками за один запрос
      const { data, error } = await supabase
        .from('rate_materials_mapping')
        .select(`
          *,
          material:materials (
            id,
            code,
            name,
            description,
            unit_id,
            unit_name,
            unit_short_name,
            last_purchase_price,
            supplier,
            supplier_article,
            is_active
          )
        `)
        .order('created_at', { ascending: true })

      console.log('Optimized rate materials query:', {
        action: 'load_all_rate_materials_optimized', 
        timestamp: new Date().toISOString(),
        success: !error,
        dataCount: data?.length || 0,
        error: error?.message,
        data: data
      })

      if (error) {
        console.error('Get all rate materials error:', error)
        throw error
      }
      
      // Группируем результаты по rate_id
      const grouped: Record<string, RateMaterial[]> = {}
      if (data) {
        data.forEach((rateMaterial) => {
          if (!grouped[rateMaterial.rate_id]) {
            grouped[rateMaterial.rate_id] = []
          }
          grouped[rateMaterial.rate_id].push(rateMaterial)
        })
      }
      
      console.log('All rate materials grouped:', {
        action: 'group_rate_materials',
        timestamp: new Date().toISOString(),
        totalMaterials: data?.length || 0,
        groupedRatesCount: Object.keys(grouped).length,
        grouped
      })
      
      return grouped
    },
    enabled: true, // Выполняем запрос независимо от rates, так как это один оптимизированный запрос
  })

  console.log('Rates page rendered', {
    action: 'page_render',
    timestamp: new Date().toISOString(),
    ratesCount: rates.length,
    unitsCount: units.length,
    isLoading,
    unitsLoading,
  })

  // Преобразуем данные из БД в формат RateGroup при изменении данных
  React.useEffect(() => {
    if (rates.length > 0 && !rateMaterialsLoading) {
      const groups = convertRatesToGroups(rates, allRateMaterials)
      setRateGroups(groups)
      console.log('Rate groups converted:', {
        ratesCount: rates.length,
        groupsCount: groups.length,
        materialsCount: Object.keys(allRateMaterials).length
      })
    }
  }, [rates, allRateMaterials, rateMaterialsLoading])

  // Проверка что данные из БД загружаются
  console.log('Rate materials from database:', {
    allRateMaterialsKeys: Object.keys(allRateMaterials),
    allRateMaterialsValues: allRateMaterials,
    loading: rateMaterialsLoading
  })

  // Проверка существования таблицы rate_materials_mapping
  React.useEffect(() => {
    const checkTable = async () => {
      try {
        const { data, error } = await supabase
          .from('rate_materials_mapping')
          .select('id')
          .limit(1)
        
        console.log('Table rate_materials_mapping check:', {
          exists: !error,
          error: error?.message,
          data: data
        })
        
        if (error) {
          console.error('⚠️  КРИТИЧЕСКАЯ ОШИБКА: Таблица rate_materials_mapping не существует!')
          console.error('Выполните SQL миграцию в Supabase Dashboard!')
        }
      } catch (err) {
        console.error('Database connection error:', err)
      }
    }
    
    checkTable()
  }, [])

  const createMutation = useMutation({
    mutationFn: ratesApi.create,
    onSuccess: async data => {
      console.log('Rate created successfully:', data)
      console.log('tempRateMaterials at creation:', {
        length: tempRateMaterials.length,
        materials: tempRateMaterials,
        hasDataId: !!data.id
      })
      
      // Связываем материалы с новой расценкой в базе данных
      if (tempRateMaterials.length > 0 && data.id) {
        try {
          const rateMaterialsToCreate = tempRateMaterials.map(material => {
            const materialId = material.id.startsWith('catalog-') 
              ? (material as any).originalId || material.id.replace('catalog-', '')
              : material.id

            return {
              rate_id: data.id,
              material_id: materialId,
              consumption: material.consumption || 1,
              unit_price: material.last_purchase_price || 0,
              notes: `Материал добавлен при создании расценки`
            }
          })

          // Сохраняем материалы в базу данных
          console.log('Attempting to save materials to database:', {
            rateId: data.id,
            materialsCount: rateMaterialsToCreate.length,
            materials: rateMaterialsToCreate
          })
          
          const savedMaterials = await rateMaterialsApi.createMany(rateMaterialsToCreate)
          
          console.log('✅ Materials saved to database successfully:', {
            rateId: data.id,
            materialsCount: rateMaterialsToCreate.length,
            savedMaterials: savedMaterials
          })
          
          // Очищаем временные материалы
          setTempRateMaterials([])
          
          // Автоматически раскрываем новую расценку
          setTimeout(() => {
            setExpandedRates(prev => new Set([...prev, data.id]))
          }, 100)
          
        } catch (materialError) {
          console.error('Error saving materials to database:', materialError)
          message.warning('Расценка создана, но возникла ошибка при сохранении материалов')
        }
      }
      
      // Обновляем кэш и перезагружаем данные
      await queryClient.invalidateQueries({ queryKey: ['rates'] })
      await queryClient.invalidateQueries({ queryKey: ['rateMaterials', 'all'] })
      
      console.log('✅ Cache invalidated, queries will reload')
      
      message.success('Расценка успешно создана')
      handleCloseModal()
    },
    onError: error => {
      console.error('Create error details:', {
        error,
        message: error.message,
        timestamp: new Date().toISOString(),
      })
      message.error(`Ошибка при создании расценки: ${error.message}`)
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: RateUpdate }) =>
      ratesApi.update(id, data),
    onSuccess: async (data, variables) => {
      console.log('Rate updated successfully:', data)
      
      // Обновляем материалы расценки
      if (tempRateMaterials.length > 0 && variables.id) {
        try {
          // Удаляем все старые материалы расценки
          await rateMaterialsApi.deleteByRateId(variables.id)
          console.log('Old materials deleted for rate:', variables.id)
          
          // Создаем новые материалы
          const rateMaterialsToCreate = tempRateMaterials.map(material => {
            const materialId = material.id.startsWith('catalog-') 
              ? (material as any).originalId || material.id.replace('catalog-', '')
              : (material as any).originalId || material.id

            return {
              rate_id: variables.id,
              material_id: materialId,
              consumption: material.consumption || 1,
              unit_price: material.last_purchase_price || 0,
              notes: `Материал обновлен при редактировании расценки`
            }
          })
          
          console.log('Updating rate materials:', {
            rateId: variables.id,
            materialsCount: rateMaterialsToCreate.length,
            materials: rateMaterialsToCreate
          })
          
          await rateMaterialsApi.createMany(rateMaterialsToCreate)
          console.log('✅ Rate materials updated successfully')
          
        } catch (materialError) {
          console.error('Error updating rate materials:', materialError)
          message.warning('Расценка обновлена, но возникла ошибка при сохранении материалов')
        }
      }
      
      // Обновляем кэш
      await queryClient.invalidateQueries({ queryKey: ['rates'] })
      await queryClient.invalidateQueries({ queryKey: ['rateMaterials', 'all'] })
      
      message.success('Расценка и материалы успешно обновлены')
      handleCloseModal()
    },
    onError: error => {
      console.error('Update error details:', {
        error,
        message: error.message,
        timestamp: new Date().toISOString(),
      })
      message.error(`Ошибка при обновлении расценки: ${error.message}`)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: ratesApi.delete,
    onSuccess: () => {
      console.log('Rate deleted successfully')
      queryClient.invalidateQueries({ queryKey: ['rates'] })
      message.success('Расценка успешно удалена')
    },
    onError: error => {
      console.error('Delete error details:', {
        error,
        message: error.message,
        timestamp: new Date().toISOString(),
      })
      message.error(`Ошибка при удалении расценки: ${error.message}`)
    },
  })

  // Мутация для создания материалов (пока не используется)
  const createMaterialMutation = useMutation({
    mutationFn: materialsApi.create,
    onSuccess: data => {
      console.log('Material created successfully:', data)
      queryClient.invalidateQueries({ queryKey: ['materials'] })
      message.success('Материал успешно создан')
      handleCloseMaterialModal()
    },
    onError: error => {
      console.error('Create material error details:', {
        error,
        message: error.message,
        timestamp: new Date().toISOString(),
      })
      message.error(`Ошибка при создании материала: ${error.message}`)
    },
  })

  const handleAdd = () => {
    console.log('Add rate clicked', {
      action: 'add_rate',
      timestamp: new Date().toISOString(),
    })

    setEditingRate(null)
    form.resetFields()
    form.setFieldsValue({
      is_active: true,
      category: 'общестроительные_работы',
      base_price: 0,
    })
    setTempRateMaterials([])
    setActiveTab('1')
    setIsModalOpen(true)
  }

  // Функции для работы с временными материалами в модалке
  const addTempMaterial = () => {
    // Используем первую доступную единицу измерения по умолчанию
    const defaultUnit = units[0]
    
    const newMaterial: MaterialWithUnit & { consumption?: number } = {
      id: `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      code: `МТ-${String(tempRateMaterials.length + 1).padStart(3, '0')}`,
      name: '',
      description: '',
      category: 'material',
      unit_id: defaultUnit?.id || '',
      unit_name: defaultUnit?.name || '',
      unit_short_name: defaultUnit?.short_name || '',
      last_purchase_price: 0,
      consumption: 1, // Добавляем поле расхода
      supplier: '',
      supplier_article: '',
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    setTempRateMaterials(prev => {
      const updated = [...prev, newMaterial]
      console.log('Material added to temp list:', { newMaterial, totalCount: updated.length })
      return updated
    })
  }

  const addMaterialFromCatalog = (selectedMaterialId: string) => {
    const selectedMaterial = materials.find(m => m.id === selectedMaterialId)
    if (!selectedMaterial) return

    // Проверяем, не добавлен ли уже этот материал
    const isAlreadyAdded = tempRateMaterials.some(m => 
      (m.id === `catalog-${selectedMaterial.id}`) || 
      ((m as any).originalId === selectedMaterial.id) ||
      (m.code === selectedMaterial.code && m.name === selectedMaterial.name)
    )
    
    if (isAlreadyAdded) {
      message.warning('Материал уже добавлен в список')
      return
    }

    // Добавляем материал из справочника с меткой
    const materialFromCatalog: MaterialWithUnit & { consumption?: number; originalId?: string } = {
      ...selectedMaterial,
      id: `catalog-${selectedMaterial.id}`, // Метка что это материал из справочника
      originalId: selectedMaterial.id, // Сохраняем оригинальный ID
      consumption: 1, // По умолчанию 1 единица расхода
      // Сохраняем оригинальные единицы измерения из материала
      unit_id: selectedMaterial.unit_id,
      unit_name: selectedMaterial.unit_name,
      unit_short_name: selectedMaterial.unit_short_name,
    }
    
    setTempRateMaterials(prev => {
      const updated = [...prev, materialFromCatalog]
      console.log('Material from catalog added to temp list:', { 
        materialFromCatalog, 
        totalCount: updated.length,
        selectedMaterial: selectedMaterial.name 
      })
      return updated
    })
    message.success(`Материал "${selectedMaterial.name}" добавлен`)
  }

  const removeTempMaterial = (materialId: string) => {
    setTempRateMaterials(prev => prev.filter(m => m.id !== materialId))
  }

  const updateTempMaterial = (materialId: string, field: string, value: any) => {
    setTempRateMaterials(prev => prev.map(material => 
      material.id === materialId 
        ? { ...material, [field]: value, updated_at: new Date().toISOString() }
        : material
    ))
  }

  const handleEdit = async (rate: RateWithUnit) => {
    console.log('Edit rate clicked', {
      action: 'edit_rate',
      rateId: rate.id,
      rateName: rate.name,
      timestamp: new Date().toISOString(),
    })

    setEditingRate(rate)
    form.setFieldsValue(rate)
    
    // Загружаем существующие материалы расценки
    try {
      const rateMaterials = await rateMaterialsApi.getByRateId(rate.id)
      console.log('Loaded materials for editing rate:', {
        rateId: rate.id,
        materialsCount: rateMaterials.length,
        materials: rateMaterials
      })
      
      // Преобразуем материалы в формат для редактирования
      const tempMaterials = rateMaterials.map(rateMaterial => ({
        id: rateMaterial.material?.id || rateMaterial.material_id,
        code: rateMaterial.material?.code || '',
        name: rateMaterial.material?.name || '',
        description: rateMaterial.material?.description || '',
        category: 'material' as const,
        unit_id: rateMaterial.material?.unit_id || '', // Используем единицы из материала
        unit_name: rateMaterial.material?.unit_name || '',
        unit_short_name: rateMaterial.material?.unit_short_name || '',
        last_purchase_price: rateMaterial.unit_price,
        supplier: rateMaterial.material?.supplier || '',
        supplier_article: rateMaterial.material?.supplier_article || '',
        is_active: rateMaterial.material?.is_active ?? true,
        created_at: rateMaterial.created_at,
        updated_at: rateMaterial.updated_at,
        consumption: rateMaterial.consumption,
        originalId: rateMaterial.material?.id || rateMaterial.material_id,
        rateMaterialId: rateMaterial.id // Для обновления
      }))
      
      setTempRateMaterials(tempMaterials)
      setActiveTab('1') // Открываем на первой вкладке
      
    } catch (error) {
      console.error('Error loading materials for rate editing:', error)
      setTempRateMaterials([]) // Очищаем если ошибка
    }
    
    setIsModalOpen(true)
  }

  const handleDelete = (id: string) => {
    console.log('Delete rate clicked', {
      action: 'delete_rate',
      rateId: id,
      timestamp: new Date().toISOString(),
    })

    deleteMutation.mutate(id)
  }

  // Функции для работы с блоками расценок (новый интерфейс)
  const handleEditGroup = (groupId: string) => {
    const rate = rates.find(r => r.id === groupId)
    if (rate) {
      handleEdit(rate)
    }
  }

  const handleDeleteGroup = (groupId: string) => {
    handleDelete(groupId)
  }

  const handleDuplicateGroup = (groupId: string) => {
    const rate = rates.find(r => r.id === groupId)
    if (rate) {
      // Создаем дубликат расценки
      const duplicateData = {
        code: `${rate.code}-КОПИЯ`,
        name: `${rate.name} (копия)`,
        description: rate.description,
        unit_id: rate.unit_id,
        base_price: rate.base_price,
        category: rate.category,
        subcategory: rate.subcategory,
        is_active: rate.is_active
      }

      createMutation.mutate(duplicateData)
      message.success('Расценка дублирована')
    }
  }

  const handleUpdateGroupPosition = (positionId: string, updates: Partial<RatePosition>) => {
    // Для базового функционала пока оставим только логирование
    console.log('Position update requested:', { positionId, updates })
    message.info('Редактирование позиций будет реализовано позже')
  }

  const handleAddNewGroup = () => {
    setIsAddModalVisible(true)
    console.log('Add new group modal opened')
  }

  const handleSaveNewGroup = (newGroup: RateGroup) => {
    console.log('New group saved:', newGroup)
    // Конвертируем RateGroup обратно в формат БД и сохраняем
    const rateData = {
      code: newGroup.contractor.name.replace(/\s+/g, '-').toUpperCase(),
      name: newGroup.contractor.name,
      description: '',
      unit_id: units.find(u => u.short_name === newGroup.contractor.unit)?.id || units[0]?.id || '',
      base_price: newGroup.contractor.workPrice,
      category: 'общестроительные_работы',
      is_active: true
    }

    createMutation.mutate(rateData)
    setIsAddModalVisible(false)
  }

  const handleCloseModal = () => {
    console.log('Modal closed', {
      action: 'modal_close',
      timestamp: new Date().toISOString(),
    })

    setIsModalOpen(false)
    setEditingRate(null)
    setTempRateMaterials([])
    setActiveTab('1')
    form.resetFields()
  }

  const handleAddMaterial = (rate: RateWithUnit) => {
    console.log('Add material clicked for rate:', {
      action: 'add_material_to_rate',
      rateId: rate.id,
      rateName: rate.name,
      timestamp: new Date().toISOString(),
    })

    setSelectedRateForMaterial(rate)
    materialForm.resetFields()
    materialForm.setFieldsValue({
      is_active: true,
      category: 'material',
      last_purchase_price: 0,
    })
    setIsMaterialModalOpen(true)
  }

  const handleCloseMaterialModal = () => {
    console.log('Material modal closed', {
      action: 'material_modal_close',
      timestamp: new Date().toISOString(),
    })

    setIsMaterialModalOpen(false)
    setSelectedRateForMaterial(null)
    setEditingMaterial(null)
    materialForm.resetFields()
  }

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields()

      console.log('Form submitted', {
        action: 'form_submit',
        values,
        editingRate: editingRate?.id,
        tempMaterialsCount: tempRateMaterials.length,
        timestamp: new Date().toISOString(),
      })

      if (editingRate) {
        updateMutation.mutate({
          id: editingRate.id,
          data: values,
        })
      } else {
        // Создаем расценку (материалы обработаются в onSuccess колбеке)
        createMutation.mutate(values)
      }
    } catch (error) {
      console.error('Form validation error:', error)
      message.error('Ошибка валидации формы')
    }
  }

  const handleMaterialSubmit = async () => {
    try {
      const values = await materialForm.validateFields()

      console.log('Material form submitted', {
        action: 'material_form_submit',
        values,
        editingMaterial: editingMaterial?.id,
        selectedRateId: selectedRateForMaterial?.id,
        timestamp: new Date().toISOString(),
      })

      // Находим соответствующую единицу измерения
      const unit = units.find(u => u.id === values.unit_id)
      
      if (editingMaterial) {
        // Редактирование существующего материала - TODO: реализовать сохранение в БД
        console.log('Material editing not yet implemented for database persistence')
        message.info('Редактирование материалов будет реализовано позже')
      } else if (selectedRateForMaterial) {
        // Добавление нового материала - TODO: реализовать сохранение в БД
        console.log('Individual material addition not yet implemented for database persistence')
        message.info('Добавление отдельных материалов будет реализовано позже. Используйте добавление через модальное окно расценки.')
      }
      
      handleCloseMaterialModal()
    } catch (error) {
      console.error('Material form validation error:', error)
      message.error('Ошибка валидации формы материала')
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

  const getCategoryConfig = (category: string) => {
    return (
      categoryOptions.find(option => option.value === category) ||
      categoryOptions[0]
    )
  }

  // Состояние для управления раскрытыми расценками
  const [expandedRates, setExpandedRates] = useState<Set<string>>(new Set())
  const [editingMaterial, setEditingMaterial] = useState<(MaterialWithUnit & { parentRateId?: string }) | null>(null)
  const [tempRateMaterials, setTempRateMaterials] = useState<(MaterialWithUnit & { consumption?: number; originalId?: string })[]>([])
  const [activeTab, setActiveTab] = useState<string>('1')

  // Тестовая функция для добавления примеров материалов
  const addExampleMaterials = (rateId: string) => {
    if (!units.length) return
    
    const exampleMaterials = [
      {
        id: `example-${rateId}-1`,
        code: 'МТ-001',
        name: 'Кирпич облицовочный',
        description: 'Кирпич облицовочный керамический',
        category: 'brick',
        unit_id: units[0]?.id || '',
        unit_name: units[0]?.name || 'шт.',
        unit_short_name: units[0]?.short_name || 'шт.',
        last_purchase_price: 15.50,
        supplier: 'Кирпичный завод но. 1',
        supplier_article: 'КО-150',
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: `example-${rateId}-2`,
        code: 'МТ-002',
        name: 'Цемент М400',
        description: 'Портландцемент М400 До',
        category: 'concrete',
        unit_id: units[1]?.id || units[0]?.id || '',
        unit_name: units[1]?.name || units[0]?.name || 'кг',
        unit_short_name: units[1]?.short_name || units[0]?.short_name || 'кг',
        last_purchase_price: 280.00,
        supplier: 'Лафарж Цемент',
        supplier_article: 'LF-M400-50',
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }
    ]
    
    // TODO: реализовать сохранение примеров материалов в БД
    console.log('Example materials addition not yet implemented for database persistence')
    message.info('Добавление примеров материалов будет реализовано позже')
  }

  // Переключение раскрытия расценки
  const toggleRateExpansion = (rateId: string) => {
    const newExpanded = new Set(expandedRates)
    if (newExpanded.has(rateId)) {
      newExpanded.delete(rateId)
    } else {
      newExpanded.add(rateId)
    }
    setExpandedRates(newExpanded)
  }

  const filteredRates = rates.filter(rate => {
    const matchesSearch =
      !searchText ||
      rate.code.toLowerCase().includes(searchText.toLowerCase()) ||
      rate.name.toLowerCase().includes(searchText.toLowerCase())

    const matchesCategory = !categoryFilter || rate.category === categoryFilter

    return matchesSearch && matchesCategory
  })

  // Фильтруем группы расценок
  const filteredGroups = rateGroups.filter(group => {
    const matchesSearch =
      !searchText ||
      group.contractor.name.toLowerCase().includes(searchText.toLowerCase()) ||
      group.works.some(w => w.name.toLowerCase().includes(searchText.toLowerCase())) ||
      group.materials.some(m => m.name.toLowerCase().includes(searchText.toLowerCase()))

    const rate = rates.find(r => r.id === group.id)
    const matchesCategory = !categoryFilter || (rate && rate.category === categoryFilter)

    return matchesSearch && matchesCategory
  })

  // Функции для расчетов (аналогично консоли)
  const formatCurrency = (amount: number): string => {
    return amount.toLocaleString('ru-RU', {
      style: 'currency',
      currency: 'RUB',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    })
  }

  const getTotalCost = (groups: RateGroup[]): number => {
    return groups.reduce((total, group) => total + group.totalSum, 0)
  }

  const totalCost = getTotalCost(filteredGroups)
  const totalWorksCost = filteredGroups.reduce((sum, group) =>
    sum + group.works.reduce((workSum, work) => workSum + work.total, 0), 0
  )
  const totalMaterialsCost = filteredGroups.reduce((sum, group) =>
    sum + group.materials.reduce((materialSum, material) => materialSum + material.total, 0), 0
  )

  // Типы для иерархических данных
  type HierarchicalDataItem = (RateWithUnit & {
    isParentRate?: boolean;
    isExpanded?: boolean;
  }) | (MaterialWithUnit & {
    isChildMaterial: true;
    parentRateId: string;
    level: number;
    materialIndex: number;
    rateMaterialId?: string;
    consumption?: number;
  });

  // Создаем иерархичную структуру данных
  const createHierarchicalData = () => {
    const result: HierarchicalDataItem[] = []
    
    filteredRates.forEach(rate => {
      // Добавляем основную расценку (работу)
      result.push({
        ...rate,
        isParentRate: true,
        isExpanded: expandedRates.has(rate.id)
      })
      
      // Если расценка раскрыта, добавляем её материалы
      if (expandedRates.has(rate.id)) {
        const rateLinkedMaterials = allRateMaterials[rate.id] || []
        rateLinkedMaterials.forEach((rateMaterial, index) => {
          // Преобразуем RateMaterial в MaterialWithUnit формат
          if (rateMaterial.material) {
            result.push({
              id: rateMaterial.material.id,
              code: rateMaterial.material.code,
              name: rateMaterial.material.name,
              description: rateMaterial.material.description,
              category: 'material', // По умолчанию
              unit_id: rateMaterial.material.unit_id, // Используем единицы измерения от материала
              unit_name: rateMaterial.material.unit_name, // Используем единицы измерения от материала
              unit_short_name: rateMaterial.material.unit_short_name, // Используем единицы измерения от материала
              last_purchase_price: rateMaterial.unit_price,
              is_active: rateMaterial.material.is_active,
              created_at: rateMaterial.created_at,
              updated_at: rateMaterial.updated_at,
              consumption: rateMaterial.consumption,
              isChildMaterial: true,
              parentRateId: rate.id,
              level: 1,
              materialIndex: index,
              rateMaterialId: rateMaterial.id // Для обновлений
            })
          }
        })
      }
    })
    
    return result
  }

  const hierarchicalData = createHierarchicalData()

  // Обработчики для материалов
  const handleEditMaterial = (material: any) => {
    console.log('Edit material clicked', {
      action: 'edit_material',
      materialId: material.id,
      materialName: material.name,
      parentRateId: material.parentRateId,
      timestamp: new Date().toISOString(),
    })

    // Устанавливаем редактируемый материал и открываем модалку
    setEditingMaterial({ ...material })
    materialForm.setFieldsValue(material)
    setIsMaterialModalOpen(true)
  }

  const handleDeleteMaterial = (material: any) => {
    console.log('Delete material clicked', {
      action: 'delete_material',
      materialId: material.id,
      materialName: material.name,
      parentRateId: material.parentRateId,
      timestamp: new Date().toISOString(),
    })

    // TODO: реализовать удаление материала из БД
    console.log('Material deletion not yet implemented for database persistence')
    message.info('Удаление материалов будет реализовано позже')
  }

  const columns = [
    {
      title: 'Код/Наименование',
      dataIndex: 'code',
      key: 'code',
      render: (code: string, record: any) => {
        const isParent = !record.isChildMaterial
        const marginLeft = isParent ? 0 : 32
        
        if (isParent) {
          // Родительская расценка (работа)
          return (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Button
                type="text"
                size="small"
                icon={record.isExpanded ? <DownOutlined /> : <RightOutlined />}
                onClick={() => toggleRateExpansion(record.id)}
                style={{ padding: 0, minWidth: 20 }}
              />
              <div style={{ fontWeight: 600, color: '#1890ff' }}>
                <div>{code}</div>
                <div style={{ fontSize: '12px', color: '#666', fontWeight: 'normal' }}>
                  {record.name}
                </div>
              </div>
            </div>
          )
        } else {
          // Дочерний материал
          return (
            <div style={{ marginLeft, color: '#666' }}>
              <div style={{ fontSize: '12px' }}>├─ {code}</div>
              <div style={{ fontSize: '11px', color: '#999' }}>{record.name}</div>
            </div>
          )
        }
      },
    },
    {
      title: 'Описание',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
      render: (description: string, record: any) => (
        <span style={{ color: record.isChildMaterial ? '#999' : 'inherit' }}>
          {description || '-'}
        </span>
      ),
    },
    {
      title: 'Состав материалов',
      key: 'materials_composition',
      width: 320,
      render: (_: any, record: HierarchicalDataItem) => {
        if ('isChildMaterial' in record && record.isChildMaterial) {
          return null
        }
        
        // Найти все материалы для этой расценки из hierarchicalData
        const rateMaterials = hierarchicalData.filter(item => 
          'isChildMaterial' in item && item.isChildMaterial && 
          'parentRateId' in item && item.parentRateId === record.id
        )
        
        console.log('Materials for rate', record.id, {
          rateMaterials,
          allRateMaterials,
          hierarchicalDataCount: hierarchicalData.length,
          fromAllRateMaterials: allRateMaterials[record.id]
        })
        
        if (rateMaterials.length === 0) {
          return (
            <div style={{ 
              padding: '8px 12px', 
              backgroundColor: '#fafafa', 
              border: '1px dashed #d9d9d9', 
              borderRadius: '6px',
              textAlign: 'center'
            }}>
              <span style={{ color: '#999', fontSize: '12px' }}>
                📦 Материалы не добавлены
              </span>
            </div>
          )
        }
        
        return (
          <div style={{ 
            fontSize: '11px', 
            backgroundColor: '#f6ffed', 
            border: '1px solid #b7eb8f', 
            borderRadius: '6px',
            padding: '8px'
          }}>
            <div style={{ 
              fontWeight: 600, 
              color: '#52c41a', 
              marginBottom: '6px',
              fontSize: '12px'
            }}>
              📦 Материалов: {rateMaterials.length}
            </div>
            
            {rateMaterials.map((material, index) => {
              if (!('isChildMaterial' in material) || !material.isChildMaterial) return null
              
              const consumption = material.consumption || 1
              const price = material.last_purchase_price || 0
              const totalCost = price * consumption
              
              return (
                <div 
                  key={material.id} 
                  style={{ 
                    marginBottom: index < rateMaterials.length - 1 ? 6 : 0,
                    padding: '4px 6px',
                    backgroundColor: 'white',
                    border: '1px solid #e8f5e8',
                    borderRadius: '4px'
                  }}
                >
                  <div style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center' 
                  }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ color: '#1890ff', fontWeight: 600, fontSize: '12px' }}>
                        {material.code}
                      </div>
                      <div style={{ 
                        color: '#262626', 
                        fontSize: '11px',
                        maxWidth: '180px',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                      }}>
                        {material.name}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right', marginLeft: '8px' }}>
                      <div style={{ color: '#722ed1', fontWeight: 600, fontSize: '11px' }}>
                        {consumption} {material.unit_short_name}
                      </div>
                      <div style={{ color: '#52c41a', fontWeight: 600, fontSize: '11px' }}>
                        {totalCost.toFixed(2)} ₽
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
            
            <div style={{ 
              marginTop: 8, 
              paddingTop: 6, 
              borderTop: '2px solid #52c41a',
              textAlign: 'center'
            }}>
              <span style={{ color: '#52c41a', fontWeight: 700, fontSize: '13px' }}>
                💰 Итого: {rateMaterials.reduce((sum, m) => {
                  if ('isChildMaterial' in m && m.isChildMaterial) {
                    return sum + (m.last_purchase_price || 0) * (m.consumption || 1)
                  }
                  return sum
                }, 0).toFixed(2)} ₽
              </span>
            </div>
          </div>
        )
      },
    },
    {
      title: 'Ед. изм.',
      dataIndex: 'unit_short_name',
      key: 'unit_short_name',
      width: 80,
      sorter: (a: any, b: any) => a.unit_short_name.localeCompare(b.unit_short_name),
    },
    {
      title: 'Расход',
      key: 'consumption',
      width: 100,
      render: (_: any, record: HierarchicalDataItem) => {
        if ('isChildMaterial' in record && record.isChildMaterial && record.consumption) {
          return (
            <span style={{ color: '#1890ff', fontWeight: 500 }}>
              {record.consumption} {record.unit_short_name}
            </span>
          )
        }
        return ('isChildMaterial' in record && record.isChildMaterial) ? '1 ед.' : '—'
      },
    },
    {
      title: 'Цена',
      key: 'price',
      width: 120,
      render: (_: any, record: HierarchicalDataItem) => {
        if ('isChildMaterial' in record && record.isChildMaterial) {
          const price = record.last_purchase_price || 0
          const consumption = record.consumption || 1
          const totalCost = price * consumption
          
          return (
            <div>
              <div>{price.toFixed(2)} ₽/{record.unit_short_name}</div>
              {consumption !== 1 && (
                <div style={{ fontSize: '11px', color: '#666' }}>
                  Итого: {totalCost.toFixed(2)} ₽
                </div>
              )}
            </div>
          )
        }
        
        // Для родительских расценок - показать базовую цену + стоимость материалов
        const rateMaterials = hierarchicalData.filter(item => 
          'isChildMaterial' in item && item.isChildMaterial && 
          'parentRateId' in item && item.parentRateId === record.id
        )
        const materialsCost = rateMaterials.reduce((sum, m) => {
          if ('isChildMaterial' in m && m.isChildMaterial) {
            return sum + (m.last_purchase_price || 0) * (m.consumption || 1)
          }
          return sum
        }, 0)
        const totalCost = ('base_price' in record ? record.base_price : 0) + materialsCost
        
        return (
          <div>
            <div style={{ fontWeight: 600 }}>
              {totalCost.toFixed(2)} ₽
            </div>
            <div style={{ fontSize: '11px', color: '#666' }}>
              Работа: {('base_price' in record ? record.base_price : 0).toFixed(2)} ₽
            </div>
            {materialsCost > 0 && (
              <div style={{ fontSize: '11px', color: '#52c41a' }}>
                Материалы: {materialsCost.toFixed(2)} ₽
              </div>
            )}
          </div>
        )
      },
      sorter: (a: HierarchicalDataItem, b: HierarchicalDataItem) => {
        let priceA, priceB
        
        if ('isChildMaterial' in a && a.isChildMaterial) {
          priceA = a.last_purchase_price || 0
        } else {
          const aMaterials = hierarchicalData.filter(item => 
            'isChildMaterial' in item && item.isChildMaterial && 
            'parentRateId' in item && item.parentRateId === a.id
          )
          const aMaterialsCost = aMaterials.reduce((sum, m) => {
            if ('isChildMaterial' in m && m.isChildMaterial) {
              return sum + (m.last_purchase_price || 0) * (m.consumption || 1)
            }
            return sum
          }, 0)
          priceA = ('base_price' in a ? a.base_price : 0) + aMaterialsCost
        }
        
        if ('isChildMaterial' in b && b.isChildMaterial) {
          priceB = b.last_purchase_price || 0
        } else {
          const bMaterials = hierarchicalData.filter(item => 
            'isChildMaterial' in item && item.isChildMaterial && 
            'parentRateId' in item && item.parentRateId === b.id
          )
          const bMaterialsCost = bMaterials.reduce((sum, m) => {
            if ('isChildMaterial' in m && m.isChildMaterial) {
              return sum + (m.last_purchase_price || 0) * (m.consumption || 1)
            }
            return sum
          }, 0)
          priceB = ('base_price' in b ? b.base_price : 0) + bMaterialsCost
        }
        
        return priceA - priceB
      },
    },
    {
      title: 'Категория',
      dataIndex: 'category',
      key: 'category',
      width: 180,
      render: (category: string, record: any) => {
        if (record.isChildMaterial) {
          const materialCategories = {
            concrete: { label: 'Бетон', color: 'blue' },
            metal: { label: 'Металл', color: 'volcano' },
            brick: { label: 'Кирпич', color: 'orange' },
            insulation: { label: 'Утеплители', color: 'green' },
            finishing: { label: 'Отделочные', color: 'purple' },
            material: { label: 'Материал', color: 'red' },
            other: { label: 'Прочие', color: 'default' }
          }
          const config = materialCategories[category as keyof typeof materialCategories] || materialCategories.other
          return <Tag color={config.color}>{config.label}</Tag>
        }
        const config = getCategoryConfig(category)
        return <Tag color={config.color}>{config.label}</Tag>
      },
      sorter: (a: any, b: any) => a.category.localeCompare(b.category),
    },
    {
      title: 'Подкатегория/Поставщик',
      key: 'subcategory_supplier',
      render: (_: any, record: any) => {
        if (record.isChildMaterial) {
          return record.supplier || '-'
        }
        return record.subcategory || '-'
      },
    },
    {
      title: 'Активность',
      dataIndex: 'is_active',
      key: 'is_active',
      width: 100,
      render: (isActive: boolean, record: any) => (
        <span
          style={{
            color: isActive ? '#52c41a' : '#ff4d4f',
            fontWeight: 500,
            opacity: record.isChildMaterial ? 0.7 : 1
          }}
        >
          {isActive ? 'Активна' : 'Неактивна'}
        </span>
      ),
      sorter: (a: any, b: any) => Number(a.is_active) - Number(b.is_active),
    },
    {
      title: 'Дата создания',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 140,
      render: (date: string, record: any) => (
        <span style={{ opacity: record.isChildMaterial ? 0.7 : 1 }}>
          {new Date(date).toLocaleDateString('ru-RU')}
        </span>
      ),
      sorter: (a: any, b: any) =>
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
    },
    {
      title: 'Действия',
      key: 'actions',
      width: 180,
      render: (_: unknown, record: any) => {
        if (record.isChildMaterial) {
          return (
            <Space>
              <Button
                type="text"
                size="small"
                icon={<EditOutlined />}
                title="Редактировать материал"
                style={{ color: '#1890ff' }}
                onClick={() => handleEditMaterial(record)}
              />
              <Button
                type="text"
                size="small"
                danger
                icon={<DeleteOutlined />}
                title="Удалить материал"
                onClick={() => handleDeleteMaterial(record)}
              />
            </Space>
          )
        }
        
        return (
          <Space>
            <Button
              type="text"
              size="small"
              icon={<PlusOutlined />}
              onClick={() => handleAddMaterial(record)}
              title="Добавить материал"
              style={{ color: '#52c41a' }}
            />
            <Button
              type="text"
              size="small"
              onClick={() => addExampleMaterials(record.id)}
              title="Добавить примеры материалов"
              style={{ color: '#1890ff', fontSize: '10px' }}
            >
              Примеры
            </Button>
            <Button
              type="text"
              size="small"
              icon={<EditOutlined />}
              onClick={() => handleEdit(record)}
              title="Редактировать расценку"
            />
            <Popconfirm
              title="Удалить расценку?"
              description="Это действие нельзя отменить. Все связанные материалы также будут удалены."
              onConfirm={() => handleDelete(record.id)}
              okText="Да"
              cancelText="Отмена"
            >
              <Button
                type="text"
                size="small"
                danger
                icon={<DeleteOutlined />}
                title="Удалить расценку"
              />
            </Popconfirm>
          </Space>
        )
      },
    },
  ]

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '24px' }}>
      {/* Заголовок */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <Title level={2} style={{ margin: 0, color: '#1f2937' }}>
          <BuildOutlined style={{ marginRight: '12px' }} />
          Сборник расценок
        </Title>
        <Button
          type="primary"
          size="large"
          icon={<PlusOutlined />}
          onClick={handleAddNewGroup}
        >
          Добавить расценку
        </Button>
      </div>

      {/* Фильтры */}
      <Card size="small" style={{
        background: '#f8fafc',
        border: '1px solid #e2e8f0',
        borderRadius: 12,
        marginBottom: '24px'
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
              {categoryOptions.map(category => (
                <Select.Option key={category.value} value={category.value}>
                  <Tag color={category.color}>{category.label}</Tag>
                </Select.Option>
              ))}
            </Select>
          </Col>
        </Row>
      </Card>

      {/* Сводная информация */}
      <Card style={{ marginBottom: '24px' }} title={
        <span>
          <FileTextOutlined style={{ marginRight: '8px' }} />
          Сводная информация по расценкам
        </span>
      }>
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12} md={6}>
            <Statistic
              title="Количество расценок"
              value={filteredGroups.length}
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
        {filteredGroups.length === 0 ? (
          <Card>
            <div style={{ textAlign: 'center', padding: '40px 0' }}>
              <Text type="secondary" style={{ fontSize: '16px' }}>
                {isLoading ? 'Загрузка расценок...' : 'Нет расценок. Нажмите "Добавить расценку" для создания новой.'}
              </Text>
            </div>
          </Card>
        ) : (
          filteredGroups.map((group) => (
            <RateBlock
              key={group.id}
              group={group}
              onEdit={handleEditGroup}
              onDelete={handleDeleteGroup}
              onDuplicate={handleDuplicateGroup}
              onUpdatePosition={handleUpdateGroupPosition}
            />
          ))
        )}
      </div>

      {/* Общий итог */}
      {filteredGroups.length > 0 && (
        <Card
          style={{
            background: '#1f2937',
            border: 'none'
          }}
          bodyStyle={{ padding: '24px' }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <Title level={3} style={{ color: 'white', margin: 0 }}>
                Общая стоимость расценок:
              </Title>
              <Text style={{ color: '#9ca3af' }}>
                {filteredGroups.length} расценок | Работы: {formatCurrency(totalWorksCost)} | Материалы: {formatCurrency(totalMaterialsCost)}
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
                  Печать каталога
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

export default Rates
