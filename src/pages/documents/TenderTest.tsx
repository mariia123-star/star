import React, { useState, useRef, useEffect, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  Card,
  Button,
  Space,
  Input,
  Select,
  DatePicker,
  Row,
  Col,
  Modal,
  Upload,
  App,
  Tabs,
  TabsProps,
  message as antMessage,
  Form,
  InputNumber,
} from 'antd'
import {
  PlusOutlined,
  DownloadOutlined,
  UploadOutlined,
  DownOutlined,
  UpOutlined,
  FileTextOutlined,
  CalculatorOutlined,
  TableOutlined,
  DatabaseOutlined,
  SaveOutlined,
  GoogleOutlined,
  LinkOutlined,
} from '@ant-design/icons'
import {
  EstimatePosition,
  JUSTIFICATION_TYPES,
  UNITS,
  RateGroup,
} from '@/shared/types/estimate'
import EstimateTable from '@/widgets/estimate/EstimateTable'
import { useQuery } from '@tanstack/react-query'
import { RateAutocomplete } from '@/widgets/estimate'
import { ratesApi } from '@/entities/rates'
import { projectsApi } from '@/entities/projects'
import { supabase } from '@/lib/supabase'
import { useMaterialTypes } from '@/shared/hooks/useMaterialTypes'
import {
  getMaterialTypeByShortName,
  type MaterialType,
} from '@/entities/material-types'

const { Option } = Select

export default function TenderTest() {
  const { message } = App.useApp()
  const [searchParams] = useSearchParams()
  const estimateId = searchParams.get('estimateId') // Получаем ID сметы из URL
  const isNewEstimate = searchParams.get('new') === 'true' // Флаг создания новой сметы
  const [activeTab, setActiveTab] = useState<string>('table')
  const [filtersExpanded, setFiltersExpanded] = useState(false)
  const [selectedPositions, setSelectedPositions] = useState<string[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedProject, setSelectedProject] = useState<string>()
  const [selectedJustification, setSelectedJustification] = useState<string>()
  const [rateGroups, setRateGroups] = useState<RateGroup[]>([])
  const [isSaving, setIsSaving] = useState(false)
  const [googleSheetsModalVisible, setGoogleSheetsModalVisible] =
    useState(false)
  const [googleSheetsUrl, setGoogleSheetsUrl] = useState('')
  const [isAnalyzingSheet, setIsAnalyzingSheet] = useState(false)
  const [isTestingConnection, setIsTestingConnection] = useState(false)
  const [modifiedPositions, setModifiedPositions] = useState<Set<string>>(
    new Set()
  )
  const [isSavingChanges, setIsSavingChanges] = useState(false)
  const [currentDraftId, setCurrentDraftId] = useState<string | null>(null)
  const [draftName, setDraftName] = useState<string>('')
  const [editingCell, setEditingCell] = useState<{
    id: string
    field: string
  } | null>(null)
  const [addPositionModalVisible, setAddPositionModalVisible] = useState(false)
  const [materialsCount, setMaterialsCount] = useState(5)
  const [pendingParentId, setPendingParentId] = useState<string | undefined>(
    undefined
  )
  const [addMode, setAddMode] = useState<'rate' | 'manual'>('rate')
  const [selectedRateId, setSelectedRateId] = useState<string | null>(null)
  const [rateSearchTerm, setRateSearchTerm] = useState('')

  // Загружаем типы материалов
  const { data: materialTypes = [], isLoading: materialTypesLoading } =
    useMaterialTypes()

  // Загружаем проекты
  const { data: projects = [], isLoading: projectsLoading } = useQuery({
    queryKey: ['projects'],
    queryFn: projectsApi.getAll,
  })

  // Загружаем существующие черновики для выбранного проекта
  const {
    data: drafts = [],
    isLoading: draftsLoading,
    refetch: refetchDrafts,
  } = useQuery({
    queryKey: ['estimate-drafts', selectedProject],
    queryFn: async () => {
      if (!selectedProject) return []

      const { data, error } = await supabase
        .from('estimate_drafts')
        .select('*')
        .eq('project_id', selectedProject)
        .eq('status', 'draft')
        .order('updated_at', { ascending: false })

      if (error) {
        console.error('Error loading drafts:', error)
        return []
      }

      return data || []
    },
    enabled: !!selectedProject,
  })

  // Загружаем расценки из сборника
  const {
    data: rates = [],
    isLoading: ratesLoading,
    refetch: refetchRates,
  } = useQuery({
    queryKey: ['rates'],
    queryFn: ratesApi.getAll,
    refetchInterval: 30000, // Автообновление каждые 30 секунд (было 5)
  })

  // Загружаем все материалы
  const { data: allMaterials = [] } = useQuery({
    queryKey: ['materials', 'all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('materials')
        .select('*')
        .eq('is_active', true)

      if (error) {
        console.error('❌ Error loading materials:', error)
        return []
      }

      console.log('✅ Loaded materials:', data?.length || 0)
      return data || []
    },
    enabled: true,
  })

  // Загружаем связи расценок с материалами
  const {
    data: allRateMaterials = {},
    isLoading: rateMaterialsLoading,
    refetch: refetchRateMaterials,
  } = useQuery({
    queryKey: ['rateMaterials', 'all'],
    queryFn: async () => {
      console.log('📦 Loading rate materials from database...')

      const { data, error } = await supabase
        .from('rate_materials_mapping')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) {
        console.error('❌ Error loading rate materials:', error)
        return {}
      }

      console.log('✅ Loaded rate materials mappings:', data?.length || 0)

      // Создаем map материалов по ID для быстрого доступа
      const materialsMap = allMaterials.reduce(
        (acc: any, mat: any) => {
          acc[mat.id] = mat
          return acc
        },
        {} as Record<string, any>
      )

      // Группируем материалы по rate_id и добавляем данные материала
      const grouped = data.reduce((acc: any, item: any) => {
        if (!acc[item.rate_id]) {
          acc[item.rate_id] = []
        }

        // Добавляем материал из map
        const materialData = materialsMap[item.material_id]
        acc[item.rate_id].push({
          ...item,
          materials: materialData,
        })

        return acc
      }, {})

      console.log('📊 Grouped by rates:', Object.keys(grouped).length, 'rates')

      return grouped
    },
    enabled: true && allMaterials.length > 0, // Включено только когда материалы загружены
    refetchInterval: 30000, // Автообновление каждые 30 секунд
  })

  // Функция автоматического импорта нового материала
  const handleAutoImportNewMaterial = useCallback(
    async (newMaterial: any) => {
      console.log('Auto-importing new material:', newMaterial)

      // Используем callback для получения актуального состояния positions
      setPositions(currentPositions => {
        // Проверяем, не добавлен ли уже этот материал
        if (currentPositions.some(p => p.id === `material-${newMaterial.id}`)) {
          console.log('Material already imported, skipping')
          return currentPositions
        }

        // Создаем позицию для нового материала
        const materialPosition: EstimatePosition = {
          id: `material-${newMaterial.id}`,
          number: `${currentPositions.length + 1}`,
          justification: 'мат',
          materialType: materialTypes[0]?.short_name || 'основ',
          workName: newMaterial.name,
          unit: newMaterial.unit_short_name || 'ед',
          volume: 1,
          materialNorm: 1,
          workPrice: 0,
          materialPrice: newMaterial.last_purchase_price || 0,
          deliveryPrice: 0,
          total: newMaterial.last_purchase_price || 0,
          level: 0,
          created_at: new Date().toISOString(),
        }

        // Добавляем новую позицию к существующим
        const newPositions = [...currentPositions, materialPosition]
        console.log('Auto-imported material position:', materialPosition)
        return newPositions
      })

      message.success(
        `Материал "${newMaterial.name}" автоматически добавлен в табличный режим`
      )
    },
    [message, materialTypes]
  )

  // Функция автоматического импорта новой расценки
  const handleAutoImportNewRate = useCallback(
    async (newRate: any) => {
      console.log('Auto-importing new rate:', newRate)

      // Загружаем материалы для этой расценки
      const { data: materials, error } = await supabase
        .from('rate_materials_mapping')
        .select(
          `
        *,
        material:materials!material_id(*)
      `
        )
        .eq('rate_id', newRate.id)

      if (error) {
        console.error('Error loading materials for new rate:', error)
      }

      // Используем callback для получения актуального состояния positions
      setPositions(currentPositions => {
        // Проверяем, не добавлена ли уже эта расценка
        if (currentPositions.some(p => p.id === `rate-${newRate.id}`)) {
          console.log('Rate already imported, skipping')
          return currentPositions
        }

        // Создаем позицию для новой расценки
        const contractorPosition: EstimatePosition = {
          id: `rate-${newRate.id}`,
          number: `${currentPositions.length + 1}`,
          justification: 'подрядчик',
          workName: newRate.name,
          unit: newRate.unit_short_name || 'компл',
          volume: 1,
          workPrice: 0,
          total: 0,
          level: 0,
          expanded: true, // Разворачиваем для наглядности
          created_at: new Date().toISOString(),
          children: [],
        }

        // Добавляем работу
        const workPosition: EstimatePosition = {
          id: `rate-work-${newRate.id}`,
          number: `${currentPositions.length + 1}.1`,
          parentId: contractorPosition.id,
          justification: 'раб',
          workName: newRate.name,
          unit: newRate.unit_short_name || 'ед',
          volume: 1,
          workPrice: newRate.base_price || 0,
          total: newRate.base_price || 0,
          level: 1,
          created_at: new Date().toISOString(),
        }

        contractorPosition.children?.push(workPosition)
        let totalCost = newRate.base_price || 0

        // Добавляем материалы
        if (materials && materials.length > 0) {
          materials.forEach((material: any, index: number) => {
            const volume = material.consumption || 1
            const price = material.unit_price || 0
            const materialTotal = volume * price

            const materialPosition: EstimatePosition = {
              id: `rate-mat-${newRate.id}-${index}`,
              number: `${currentPositions.length + 1}.${index + 2}`,
              parentId: contractorPosition.id,
              justification: 'мат',
              materialType: materialTypes[0]?.short_name || 'основ',
              workName: material.material?.name || 'Материал',
              unit: material.material?.unit_short_name || 'ед',
              volume: volume,
              materialNorm: material.consumption || 1,
              workPrice: 0,
              materialPrice: price,
              deliveryPrice: 0,
              total: materialTotal,
              level: 1,
              created_at: new Date().toISOString(),
            }

            contractorPosition.children?.push(materialPosition)
            totalCost += materialTotal
          })
        }

        // Обновляем общую стоимость группы
        contractorPosition.total = totalCost

        // Добавляем новую позицию к существующим
        const newPositions = [...currentPositions, contractorPosition]
        console.log('Auto-imported rate position:', contractorPosition)
        return newPositions
      })

      message.success(
        `Расценка "${newRate.name}" автоматически добавлена в табличный режим`
      )
    },
    [message]
  )

  // Автосохранение через 5 секунд после изменения
  useEffect(() => {
    if (modifiedPositions.size > 0 && selectedProject) {
      const timer = window.setTimeout(() => {
        console.log('Автосохранение через 5 секунд...')
        handleSaveChanges()
      }, 5000)

      return () => window.clearTimeout(timer)
    }
  }, [modifiedPositions.size, selectedProject])

  // Загрузка сметы по ID из URL (для редактирования)
  useEffect(() => {
    const loadEstimateById = async () => {
      if (!estimateId) return

      console.log('📂 Loading estimate by ID from URL:', estimateId)

      try {
        const { data: estimate, error } = await supabase
          .from('estimate_drafts')
          .select('*')
          .eq('id', estimateId)
          .single()

        if (error) {
          console.error('❌ Error loading estimate:', error)
          message.error('Ошибка загрузки сметы')
          return
        }

        if (estimate) {
          console.log('✅ Loaded estimate for editing:', {
            id: estimate.id,
            name: estimate.name,
            positionsCount: estimate.data?.positions?.length || 0,
          })

          setCurrentDraftId(estimate.id)
          setDraftName(estimate.name)
          setSelectedProject(estimate.project_id)

          if (
            estimate.data?.positions &&
            Array.isArray(estimate.data.positions)
          ) {
            setPositions(estimate.data.positions)
            message.success(`Загружена смета: ${estimate.name}`)
          }
        }
      } catch (error) {
        console.error('Error loading estimate:', error)
        message.error('Ошибка загрузки сметы')
      }
    }

    loadEstimateById()
  }, [estimateId])

  // Автоматическая загрузка последнего черновика при выборе проекта
  useEffect(() => {
    const loadLastDraft = async () => {
      // Если загружаем смету по ID, не загружаем черновик
      if (estimateId) {
        console.log('Estimate ID provided, skipping draft load')
        return
      }

      // Если создаем новую смету, не загружаем черновик
      if (isNewEstimate) {
        console.log('Creating new estimate, skipping draft load')
        return
      }

      if (!selectedProject) {
        console.log('No project selected, skipping draft load')
        return
      }

      console.log('Loading last draft for project:', selectedProject)

      try {
        const { data: drafts, error } = await supabase
          .from('estimate_drafts')
          .select('*')
          .eq('project_id', selectedProject)
          .eq('status', 'draft')
          .order('updated_at', { ascending: false })
          .limit(1)

        if (error) {
          console.error('Error loading draft:', error)
          return
        }

        if (drafts && drafts.length > 0) {
          const draft = drafts[0]
          console.log(
            '✅ Loaded draft:',
            draft.id,
            'with',
            draft.data?.positions?.length || 0,
            'positions'
          )

          setCurrentDraftId(draft.id)
          setDraftName(draft.name)

          if (draft.data?.positions && Array.isArray(draft.data.positions)) {
            setPositions(draft.data.positions)
            message.success(`Загружен черновик: ${draft.name}`)
          }
        } else {
          console.log('No drafts found for project, starting fresh')
          setPositions([])
        }
      } catch (error) {
        console.error('Error in loadLastDraft:', error)
      }
    }

    loadLastDraft()
  }, [selectedProject, isNewEstimate])

  // Подписка на изменения в таблице rates через Supabase Realtime
  useEffect(() => {
    console.log('Setting up realtime subscription for rates table')

    const channel = supabase
      .channel('rates_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'rates',
        },
        payload => {
          console.log('Rate change detected:', payload)

          // Обновляем данные при любых изменениях
          refetchRates()
          refetchRateMaterials()

          // Показываем уведомление о новой расценке
          if (payload.eventType === 'INSERT') {
            message.info('Добавлена новая расценка в сборник')

            // Если активна вкладка "Табличный режим" и НЕ создается новая смета, автоматически импортируем новую расценку
            if (activeTab === 'table' && payload.new && !isNewEstimate) {
              console.log('Auto-importing new rate to table mode')
              // Небольшая задержка чтобы данные успели обновиться
              window.setTimeout(() => {
                handleAutoImportNewRate(payload.new as any)
              }, 500)
            }
          }
        }
      )
      .subscribe()

    // Подписка на изменения в таблице rate_materials_mapping
    const materialsChannel = supabase
      .channel('rate_materials_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'rate_materials_mapping',
        },
        payload => {
          console.log('Rate materials change detected:', payload)
          refetchRateMaterials()
        }
      )
      .subscribe()

    // Подписка на изменения в таблице materials
    const materialsTableChannel = supabase
      .channel('materials_table_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'materials',
        },
        payload => {
          console.log('Materials table change detected:', payload)

          // Показываем уведомление о новом материале
          if (payload.eventType === 'INSERT') {
            message.info('Добавлен новый материал в сборник')

            // Если активна вкладка "Табличный режим" и НЕ создается новая смета, автоматически импортируем новый материал
            if (activeTab === 'table' && payload.new && !isNewEstimate) {
              console.log('Auto-importing new material to table mode')
              // Небольшая задержка чтобы данные успели обновиться
              window.setTimeout(() => {
                handleAutoImportNewMaterial(payload.new as any)
              }, 500)
            }
          }
        }
      )
      .subscribe()

    return () => {
      console.log('Cleaning up realtime subscriptions')
      supabase.removeChannel(channel)
      supabase.removeChannel(materialsChannel)
      supabase.removeChannel(materialsTableChannel)
    }
  }, [
    activeTab,
    handleAutoImportNewRate,
    handleAutoImportNewMaterial,
    message,
    refetchRates,
    refetchRateMaterials,
  ]) // Зависимости для корректной работы

  // Позиции сметы (изначально пустой массив)
  const [positions, setPositions] = useState<EstimatePosition[]>([])

  // Функция для расчета значений родительской позиции "Заказчик" на основе дочерних
  const calculateContractorValues = (
    position: EstimatePosition
  ): EstimatePosition => {
    if (
      position.justification === 'подрядчик' &&
      position.children &&
      position.children.length > 0
    ) {
      const workChild = position.children.find(
        child => child.justification === 'раб'
      )
      const contractorVolume = position.volume || 0

      // Обновляем объем работ в соответствии с объемом заказчика
      const updatedWorkChild = workChild
        ? {
            ...workChild,
            volume: contractorVolume,
            total: (workChild.workPrice || 0) * contractorVolume,
          }
        : undefined

      // Пересчитываем материалы с учетом нормы расхода и объема заказчика
      const updatedMaterialChildren = position.children
        .filter(child => child.justification === 'мат')
        .map(material => {
          const norm = material.materialNorm || 1
          const calculatedVolume = contractorVolume * norm
          const price = material.materialPrice || 0
          const delivery = material.deliveryPrice || 0

          return {
            ...material,
            volume: calculatedVolume,
            total: calculatedVolume * (price + delivery),
          }
        })

      // Собираем обновленных детей
      const updatedChildren = [
        ...(updatedWorkChild ? [updatedWorkChild] : []),
        ...updatedMaterialChildren,
      ]

      // Считаем общую стоимость работ
      const workTotal = updatedWorkChild
        ? (updatedWorkChild.workPrice || 0) * contractorVolume
        : 0

      // Считаем общую стоимость всех материалов
      const materialsTotal = updatedMaterialChildren.reduce((sum, material) => {
        return sum + (material.total || 0)
      }, 0)

      return {
        ...position,
        volume: contractorVolume,
        workPrice: workTotal, // Стоимость работ = стоимость "раб"
        materialPrice: materialsTotal, // Стоимость материалов = сумма всех "мат"
        total: workTotal + materialsTotal, // Общая стоимость
        children: updatedChildren,
      }
    }
    return position
  }

  // Функции для управления позициями сметы
  const handlePositionUpdate = useCallback(
    (id: string, updates: Partial<EstimatePosition>) => {
      const updatePositionRecursive = (
        positions: EstimatePosition[]
      ): EstimatePosition[] => {
        return positions.map(position => {
          if (position.id === id) {
            // Помечаем позицию как измененную
            const updatedPosition = { ...position, ...updates, isEdited: true }

            // Если это позиция "подрядчик" и изменился объем - пересчитываем все
            if (
              updatedPosition.justification === 'подрядчик' &&
              updates.volume !== undefined
            ) {
              console.log('🔄 Пересчет позиции подрядчика:', {
                id,
                oldVolume: position.volume,
                newVolume: updates.volume,
              })
              return calculateContractorValues(updatedPosition)
            }

            // Для остальных позиций - стандартный пересчет total
            if (
              updates.volume !== undefined ||
              updates.workPrice !== undefined ||
              updates.materialPrice !== undefined ||
              updates.deliveryPrice !== undefined
            ) {
              const volume = updatedPosition.volume || 0
              const workPrice = updatedPosition.workPrice || 0
              const materialPrice = updatedPosition.materialPrice || 0
              const deliveryPrice = updatedPosition.deliveryPrice || 0

              // Для материалов: total = volume * (materialPrice + deliveryPrice)
              if (updatedPosition.justification === 'мат') {
                updatedPosition.total = volume * (materialPrice + deliveryPrice)
              }
              // Для работ: total = volume * workPrice
              else if (updatedPosition.justification === 'раб') {
                updatedPosition.total = volume * workPrice
              }
              // Для остальных: total = volume * workPrice
              else {
                updatedPosition.total = volume * workPrice
              }
            }

            return updatedPosition
          }
          if (position.children) {
            const updatedChildren = updatePositionRecursive(position.children)
            const positionWithUpdatedChildren = {
              ...position,
              children: updatedChildren,
            }
            // Если это родительская позиция "Заказчик", пересчитываем её значения
            if (positionWithUpdatedChildren.justification === 'подрядчик') {
              return calculateContractorValues(positionWithUpdatedChildren)
            }
            return positionWithUpdatedChildren
          }
          return position
        })
      }

      setPositions(updatePositionRecursive(positions))

      // Отмечаем позицию как измененную для отслеживания
      setModifiedPositions(prev => {
        const newSet = new Set(prev)
        newSet.add(id)
        return newSet
      })
    },
    [positions, modifiedPositions.size]
  )

  // Открываем модальное окно для выбора количества материалов
  const handlePositionAddClick = (parentId?: string) => {
    // Если добавляем к существующему "Заказчик", сразу добавляем материал
    if (parentId) {
      const findPosition = (
        positions: EstimatePosition[],
        id: string
      ): EstimatePosition | null => {
        for (const pos of positions) {
          if (pos.id === id) return pos
          if (pos.children) {
            const found = findPosition(pos.children, id)
            if (found) return found
          }
        }
        return null
      }

      const parentPosition = findPosition(positions, parentId)

      if (parentPosition?.justification === 'подрядчик') {
        // Добавляем один материал без модального окна
        handlePositionAdd(parentId, 1)
        return
      }
    }

    // Иначе открываем модальное окно
    setPendingParentId(parentId)
    setAddPositionModalVisible(true)
  }

  // Подтверждение создания позиции с выбранным количеством материалов
  const handleConfirmAddPosition = () => {
    setAddPositionModalVisible(false)

    if (addMode === 'rate' && selectedRateId) {
      // Добавление из сборника расценок
      handleAddFromRate(selectedRateId, pendingParentId)
    } else {
      // Ручное добавление
      handlePositionAdd(pendingParentId, materialsCount)
    }

    setPendingParentId(undefined)
    setSelectedRateId(null)
    setRateSearchTerm('')
  }

  const handleAddFromRate = (rateId: string, parentId?: string) => {
    const selectedRate = rates.find(r => r.id === rateId)
    if (!selectedRate) return

    console.log('🔧 Adding rate from collection:', {
      rateId,
      rateName: selectedRate.name,
      allRateMaterialsKeys: Object.keys(allRateMaterials),
      materialsForThisRate: allRateMaterials[rateId],
      materialsCount: allRateMaterials[rateId]?.length || 0,
    })

    const timestamp = Date.now()
    const baseNumber = parentId ? `${parentId}.` : ''
    const nextNumber = parentId
      ? `${baseNumber}${positions.filter(p => p.parentId === parentId).length + 1}`
      : `${positions.length + 1}`

    // Создаем позицию заказчика
    const rateUnit =
      typeof selectedRate.unit === 'string'
        ? selectedRate.unit
        : selectedRate.unit?.short_name || 'компл'

    const contractorPosition: EstimatePosition = {
      id: `rate-contractor-${timestamp}`,
      number: nextNumber,
      parentId,
      justification: 'подрядчик',
      workName: selectedRate.name,
      unit: rateUnit,
      volume: 1,
      workPrice: 0,
      total: 0,
      level: parentId ? 1 : 0,
      expanded: true,
      created_at: new Date().toISOString(),
      children: [],
    }

    // Создаем позицию работ
    const workPosition: EstimatePosition = {
      id: `rate-work-${timestamp}`,
      number: `${nextNumber}.1`,
      parentId: contractorPosition.id,
      justification: 'раб',
      workName: selectedRate.name,
      unit: rateUnit,
      volume: 1,
      workPrice: selectedRate.unit_price || 0,
      total: selectedRate.unit_price || 0,
      level: (parentId ? 1 : 0) + 1,
      created_at: new Date().toISOString(),
    }

    contractorPosition.children = [workPosition]
    contractorPosition.total = workPosition.total

    // Добавляем материалы если они есть
    const rateMaterials = allRateMaterials[rateId] || []
    console.log('📦 Adding materials to position:', {
      rateMaterials,
      count: rateMaterials.length,
    })
    rateMaterials.forEach((rm: any, index: number) => {
      const materialPosition: EstimatePosition = {
        id: `rate-material-${timestamp}-${index}`,
        number: `${nextNumber}.${index + 2}`,
        parentId: contractorPosition.id,
        justification: 'мат',
        materialType: rm.materials?.material_type_short_name || 'основ',
        workName: rm.materials?.name || 'Материал',
        unit: rm.materials?.unit_short_name || 'ед',
        volume: rm.consumption || 1,
        materialNorm: rm.consumption || 1,
        materialPrice: rm.materials?.last_purchase_price || 0,
        deliveryPrice: 0,
        total: (rm.consumption || 1) * (rm.materials?.last_purchase_price || 0),
        level: (parentId ? 1 : 0) + 1,
        created_at: new Date().toISOString(),
      }
      contractorPosition.children?.push(materialPosition)
      contractorPosition.total += materialPosition.total
    })

    if (parentId) {
      setPositions(prev => {
        const updateChildren = (
          items: EstimatePosition[]
        ): EstimatePosition[] => {
          return items.map(item => {
            if (item.id === parentId) {
              return {
                ...item,
                children: [...(item.children || []), contractorPosition],
              }
            }
            if (item.children) {
              return { ...item, children: updateChildren(item.children) }
            }
            return item
          })
        }
        return updateChildren(prev)
      })
    } else {
      setPositions(prev => [...prev, contractorPosition])
    }

    // Отмечаем позицию как измененную для автосохранения
    setModifiedPositions(prev => {
      const newSet = new Set(prev)
      newSet.add(contractorPosition.id)
      return newSet
    })

    message.success(
      `Добавлена расценка "${selectedRate.name}" с ${rateMaterials.length} материалами`
    )
  }

  const handlePositionAdd = (
    parentId?: string,
    initialMaterialsCount: number = 5
  ) => {
    const timestamp = Date.now()

    // Если parentId указан, проверяем тип родительской позиции
    if (parentId) {
      // Ищем родительскую позицию
      const findPosition = (
        positions: EstimatePosition[],
        id: string
      ): EstimatePosition | null => {
        for (const pos of positions) {
          if (pos.id === id) return pos
          if (pos.children) {
            const found = findPosition(pos.children, id)
            if (found) return found
          }
        }
        return null
      }

      const parentPosition = findPosition(positions, parentId)

      // Если родитель - "Заказчик", добавляем новый материал
      if (parentPosition?.justification === 'подрядчик') {
        const childrenCount = parentPosition.children?.length || 0
        const materialId = `new-${timestamp}-material-${childrenCount}`

        const newMaterial: EstimatePosition = {
          id: materialId,
          number: `${parentPosition.number}.${childrenCount + 1}`,
          parentId: parentPosition.id,
          justification: 'мат',
          workName: `Материал ${childrenCount}`,
          unit: 'шт',
          volume: 1,
          workPrice: 0,
          total: 0,
          level: parentPosition.level + 1,
          created_at: new Date().toISOString(),
          isEdited: true,
        }

        const addMaterialToParent = (
          positions: EstimatePosition[]
        ): EstimatePosition[] => {
          return positions.map(position => {
            if (position.id === parentId) {
              const children = position.children || []
              const updatedPosition = {
                ...position,
                children: [...children, newMaterial],
                expanded: true,
              }
              // Пересчитываем значения заказчика
              return calculateContractorValues(updatedPosition)
            }
            if (position.children) {
              return {
                ...position,
                children: addMaterialToParent(position.children),
              }
            }
            return position
          })
        }

        setPositions(addMaterialToParent(positions))

        setModifiedPositions(prev => {
          const newSet = new Set(prev)
          newSet.add(materialId)
          return newSet
        })

        window.setTimeout(() => {
          setEditingCell({ id: materialId, field: 'workName' })
        }, 100)

        message.success('Добавлен новый материал')
        console.log('Material added:', newMaterial)
        return
      }
    }

    // В остальных случаях создаем группу: Заказчик + Работы + N материалов
    const baseNumber = parentId
      ? `${parentId}.${timestamp}`
      : `${positions.length + 1}`
    const INITIAL_MATERIALS_COUNT = initialMaterialsCount // Количество материалов при создании

    // Создаем ID для позиций
    const contractorId = `new-${timestamp}-contractor`
    const workId = `new-${timestamp}-work`

    // 1. Позиция "Заказчик" - родительская
    const contractorPosition: EstimatePosition = {
      id: contractorId,
      number: baseNumber,
      parentId,
      justification: 'подрядчик',
      workName: 'Новая позиция',
      unit: 'шт',
      volume: 0, // Будет равно объему "раб"
      workPrice: 0, // Будет равно стоимости "раб"
      materialPrice: 0, // Будет равно стоимости "мат"
      total: 0,
      level: parentId ? 1 : 0,
      created_at: new Date().toISOString(),
      isEdited: true,
      expanded: true,
      children: [],
    }

    // 2. Позиция "Работы" - дочерняя
    const workPosition: EstimatePosition = {
      id: workId,
      number: `${baseNumber}.1`,
      parentId: contractorId,
      justification: 'раб',
      workName: 'Работы',
      unit: 'шт',
      volume: 1,
      workPrice: 0,
      total: 0,
      level: (parentId ? 1 : 0) + 1,
      created_at: new Date().toISOString(),
      isEdited: true,
    }

    // 3. Создаем несколько позиций "Материалы"
    const materialPositions: EstimatePosition[] = []
    const materialIds: string[] = []

    for (let i = 0; i < INITIAL_MATERIALS_COUNT; i++) {
      const materialId = `new-${timestamp}-material-${i}`
      materialIds.push(materialId)

      materialPositions.push({
        id: materialId,
        number: `${baseNumber}.${i + 2}`,
        parentId: contractorId,
        justification: 'мат',
        workName: `Материал ${i + 1}`,
        unit: 'шт',
        volume: 1,
        workPrice: 0,
        total: 0,
        level: (parentId ? 1 : 0) + 1,
        created_at: new Date().toISOString(),
        isEdited: true,
      })
    }

    // Добавляем дочерние позиции к родительской
    contractorPosition.children = [workPosition, ...materialPositions]

    if (parentId) {
      // Добавляем как дочерний элемент
      const addToParent = (
        positions: EstimatePosition[]
      ): EstimatePosition[] => {
        return positions.map(position => {
          if (position.id === parentId) {
            const children = position.children || []
            return {
              ...position,
              children: [...children, contractorPosition],
              expanded: true,
            }
          }
          if (position.children) {
            return {
              ...position,
              children: addToParent(position.children),
            }
          }
          return position
        })
      }
      setPositions(addToParent(positions))
    } else {
      // Добавляем как корневой элемент
      setPositions([...positions, contractorPosition])
    }

    // Отмечаем все позиции как измененные
    setModifiedPositions(prev => {
      const newSet = new Set(prev)
      newSet.add(contractorId)
      newSet.add(workId)
      // Добавляем все материалы
      materialIds.forEach(id => newSet.add(id))
      return newSet
    })

    // Автоматически активируем редактирование имени позиции "Заказчик"
    window.setTimeout(() => {
      setEditingCell({ id: contractorId, field: 'workName' })
    }, 100)

    message.success(
      `Добавлено ${2 + INITIAL_MATERIALS_COUNT} позиций: Заказчик, Работы, ${INITIAL_MATERIALS_COUNT} материалов`
    )
    console.log('Positions added:', {
      parentId,
      contractor: contractorPosition,
      work: workPosition,
      materials: materialPositions,
    })
  }

  const handlePositionDelete = useCallback(
    (id: string) => {
      console.log('🗑️ Deleting position:', id)

      // Используем callback форму setState для получения актуального состояния
      setPositions(currentPositions => {
        // Проверяем, есть ли позиция для удаления
        const positionExists = findPositionById(currentPositions, id)
        if (!positionExists) {
          console.log('⚠️ Position not found, skipping deletion:', id)
          return currentPositions
        }

        const removeById = (items: EstimatePosition[]): EstimatePosition[] => {
          return items
            .filter(item => {
              if (item.id === id) {
                console.log('❌ REMOVING:', item.workName)
                return false
              }
              return true
            })
            .map(item => ({
              ...item,
              children: item.children ? removeById(item.children) : undefined,
            }))
        }

        const result = removeById(currentPositions)
        console.log('✅ Positions after deletion:', result.length)
        return result
      })

      // Обновляем выбранные позиции
      setSelectedPositions(current =>
        current.filter(selectedId => selectedId !== id)
      )

      // Отмечаем что были изменения для автосохранения
      setModifiedPositions(prev => {
        const newSet = new Set(prev)
        newSet.add(id) // Добавляем удаленную позицию как измененную
        return newSet
      })

      message.success('Позиция удалена')
    },
    [message]
  )

  // Функция импорта через серверное API
  const handleServerImport = async (customUrl?: string) => {
    const urlToUse = customUrl || googleSheetsUrl

    if (!urlToUse.trim()) {
      message.warning('Введите ссылку на Google Sheets')
      return
    }

    setIsAnalyzingSheet(true)
    try {
      message.info('Загружаем данные из Google Sheets...')

      console.log('API Request:', {
        endpoint: '/api/import/google-sheets',
        action: 'import',
        url: urlToUse,
        timestamp: new Date().toISOString(),
      })

      const response = await window.fetch(
        'http://localhost:3001/api/import/google-sheets',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            url: urlToUse,
          }),
        }
      )

      const data = await response.json()

      console.log('API Response:', {
        success: data.success,
        stats: data.stats,
        demo: data.demo,
        positionsCount: data.positions?.length || 0,
        timestamp: new Date().toISOString(),
      })

      if (data.success && data.positions) {
        // Преобразуем данные с сервера в формат EstimatePosition
        const importedPositions: EstimatePosition[] = data.positions.map(
          (pos: any, index: number) => ({
            id: `server-import-${Date.now()}-${index}`,
            number: pos.number || `${positions.length + index + 1}`,
            justification: pos.justification || 'раб',
            materialType: pos.materialType,
            workName: pos.workName || pos.name || 'Импортированная позиция',
            unit: pos.unit || 'шт',
            volume: pos.volume || pos.quantity || 1,
            workPrice: pos.workPrice || pos.price || 0,
            materialPrice: pos.materialPrice,
            deliveryPrice: pos.deliveryPrice,
            total: pos.total || pos.volume * pos.workPrice || 0,
            level: pos.level || 1,
            created_at: new Date().toISOString(),
          })
        )

        // Добавляем импортированные позиции
        setPositions(prev => [...prev, ...importedPositions])

        // Отмечаем как измененные
        setModifiedPositions(prev => {
          const newSet = new Set(prev)
          importedPositions.forEach(pos => newSet.add(pos.id))
          return newSet
        })

        const demoText = data.demo ? ' (демо данные)' : ''
        message.success(
          `Успешно импортировано ${importedPositions.length} позиций с сервера${demoText}`
        )
        console.log('Server import result:', data)

        // Закрываем модальное окно если оно открыто
        setGoogleSheetsModalVisible(false)
        setGoogleSheetsUrl('')
      } else {
        message.error(data.message || 'Ошибка импорта с сервера')
      }
    } catch (error) {
      console.error('Server import error:', error)
      message.error(`Ошибка соединения с сервером: ${error}`)
    } finally {
      setIsAnalyzingSheet(false)
    }
  }

  // Функция тестирования соединения с сервером
  const handleTestConnection = async () => {
    setIsTestingConnection(true)
    try {
      console.log('API Request:', {
        endpoint: '/api/import/test-connection',
        action: 'test',
        timestamp: new Date().toISOString(),
      })

      const response = await window.fetch(
        'http://localhost:3001/api/import/test-connection'
      )
      const data = await response.json()

      console.log('API Response:', {
        success: data.success,
        demo: data.demo,
        title: data.title,
        timestamp: new Date().toISOString(),
      })

      if (data.success) {
        const demoText = data.demo ? ' (демо режим)' : ''
        message.success(`Соединение установлено${demoText}: ${data.title}`)
      } else {
        message.error('Ошибка соединения: ' + data.error)
      }
    } catch (error) {
      console.error('Connection test error:', error)
      message.error('Ошибка тестирования соединения: ' + error)
    } finally {
      setIsTestingConnection(false)
    }
  }

  // Функция анализа и импорта из Google Sheets (старая версия)
  const handleGoogleSheetsImport = async () => {
    if (!googleSheetsUrl.trim()) {
      message.warning('Введите ссылку на Google Sheets')
      return
    }

    setIsAnalyzingSheet(true)

    try {
      console.log('🔗 Начинаем импорт из Google Sheets:', googleSheetsUrl)

      // Извлекаем ID документа из URL
      let spreadsheetId = ''
      let gid = '0'

      // Проверяем разные форматы URL
      const sheetsIdMatch = googleSheetsUrl.match(
        /\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/
      )
      const gidMatch = googleSheetsUrl.match(/[#&]gid=([0-9]+)/)

      if (!sheetsIdMatch) {
        throw new Error(
          'Неверный формат ссылки Google Sheets. Убедитесь что ссылка содержит /spreadsheets/d/[ID]'
        )
      }

      spreadsheetId = sheetsIdMatch[1]
      if (gidMatch) {
        gid = gidMatch[1]
      }

      console.log('📄 Spreadsheet ID:', spreadsheetId)
      console.log('📄 Sheet GID:', gid)

      // Пробуем несколько вариантов URL для загрузки
      const urls = [
        // Вариант 1: Прямой экспорт (может не работать из-за CORS)
        `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv&gid=${gid}`,
        // Вариант 2: Публичный URL
        `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:csv&gid=${gid}`,
        // Вариант 3: Альтернативный публичный URL
        `https://docs.google.com/spreadsheets/d/${spreadsheetId}/pub?gid=${gid}&single=true&output=csv`,
      ]

      message.info('Загружаем данные из Google Sheets...')
      let csvContent = ''
      let lastError = null

      // Пробуем каждый URL по очереди
      for (let i = 0; i < urls.length; i++) {
        const exportUrl = urls[i]
        console.log(`📤 Попытка ${i + 1}: ${exportUrl}`)

        try {
          const response = await window.fetch(exportUrl, {
            method: 'GET',
            mode: 'cors',
            headers: {
              Accept: 'text/csv,text/plain,*/*',
            },
          })

          if (response.ok) {
            csvContent = await response.text()
            console.log(`✅ Успешно загружено с попытки ${i + 1}`)
            break
          } else {
            console.log(`❌ Попытка ${i + 1} неудачна: ${response.status}`)
            lastError = new Error(
              `HTTP ${response.status}: ${response.statusText}`
            )
          }
        } catch (error) {
          console.log(`❌ Попытка ${i + 1} ошибка:`, error)
          lastError = error
        }
      }

      // Проверяем успешность загрузки
      if (!csvContent || csvContent.trim().length < 10) {
        throw (
          lastError ||
          new Error(
            'Не удалось загрузить данные ни одним из способов. Убедитесь что документ опубликован и доступен для просмотра.'
          )
        )
      }

      console.log('✅ CSV загружен:', csvContent.length, 'символов')
      console.log('📋 Первые 200 символов:', csvContent.substring(0, 200))

      // Парсим CSV
      const importedPositions = parseGoogleSheetsCSV(csvContent)

      if (importedPositions.length === 0) {
        throw new Error(
          'Не удалось извлечь позиции из документа. Проверьте формат данных.'
        )
      }

      console.log('📊 Обработано позиций:', importedPositions.length)

      // Добавляем к существующим позициям
      setPositions(prev => [...prev, ...importedPositions])

      // Отмечаем как измененные
      setModifiedPositions(prev => {
        const newSet = new Set(prev)
        importedPositions.forEach(pos => newSet.add(pos.id))
        return newSet
      })

      // Закрываем модалку
      setGoogleSheetsModalVisible(false)
      setGoogleSheetsUrl('')

      message.success(
        `🎉 Импортировано ${importedPositions.length} позиций из Google Sheets`
      )
    } catch (error: any) {
      console.error('❌ Ошибка импорта:', error)

      let errorMessage = 'Неизвестная ошибка импорта'
      if (error.message) {
        errorMessage = error.message
      } else if (typeof error === 'string') {
        errorMessage = error
      }

      message.error(`Ошибка импорта: ${errorMessage}`)
    } finally {
      setIsAnalyzingSheet(false)
    }
  }

  // Функция сохранения сметы
  // Функция сохранения изменений в существующей смете
  const handleSaveChanges = async () => {
    if (!selectedProject) {
      message.warning('Выберите проект для сохранения черновика')
      return
    }

    if (positions.length === 0) {
      message.warning('Нет позиций для сохранения')
      return
    }

    setIsSavingChanges(true)
    console.log('Saving draft to database...')

    try {
      // Подготавливаем данные для сохранения
      const draftData = {
        positions: positions,
        metadata: {
          positionsCount: positions.length,
          modifiedCount: modifiedPositions.size,
          lastModified: new Date().toISOString(),
        },
      }

      // Вычисляем общую сумму
      const calculateTotal = (items: EstimatePosition[]): number => {
        return items.reduce((sum, item) => {
          const itemTotal = item.total || 0
          const childrenTotal = item.children
            ? calculateTotal(item.children)
            : 0
          return sum + (item.level === 0 ? itemTotal : 0)
        }, 0)
      }

      const totalAmount = calculateTotal(positions)

      if (currentDraftId) {
        // Обновляем существующий черновик
        const { error } = await supabase
          .from('estimate_drafts')
          .update({
            data: draftData,
            total_amount: totalAmount,
            updated_at: new Date().toISOString(),
          })
          .eq('id', currentDraftId)

        if (error) throw error

        message.success('Черновик успешно обновлен')
        console.log('Draft updated:', currentDraftId)
      } else {
        // Создаем новый черновик
        const { data: draft, error } = await supabase
          .from('estimate_drafts')
          .insert({
            project_id: selectedProject,
            name:
              draftName ||
              `Черновик сметы от ${new Date().toLocaleDateString()}`,
            data: draftData,
            total_amount: totalAmount,
            status: 'draft',
          })
          .select()
          .single()

        if (error) throw error

        setCurrentDraftId(draft.id)
        setDraftName(draft.name)
        message.success('Черновик успешно создан')
        console.log('Draft created:', draft.id)
      }

      setModifiedPositions(new Set())
    } catch (error) {
      console.error('Error saving draft:', error)
      message.error('Ошибка при сохранении черновика')
    } finally {
      setIsSavingChanges(false)
    }
  }

  const handleSaveEstimate = async () => {
    if (!selectedProject) {
      message.warning('Выберите проект для сохранения сметы')
      return
    }

    if (positions.length === 0) {
      message.warning('Нет позиций для сохранения')
      return
    }

    setIsSaving(true)
    console.log('Saving estimate to database...')

    try {
      const totalCost = positions.reduce(
        (sum, pos) => sum + (pos.total || 0),
        0
      )

      // Если редактируем существующую смету (есть estimateId в URL)
      if (estimateId && currentDraftId === estimateId) {
        console.log('Updating existing estimate:', estimateId)

        const { data: estimate, error: estimateError } = await supabase
          .from('estimate_drafts')
          .update({
            data: {
              positions,
              totalCost,
              updatedAt: new Date().toISOString(),
            },
            updated_at: new Date().toISOString(),
          })
          .eq('id', estimateId)
          .select()
          .single()

        if (estimateError) {
          throw estimateError
        }

        console.log('Estimate updated successfully:', {
          id: estimate.id,
          name: estimate.name,
          totalCost,
          positionsCount: positions.length,
        })

        message.success(`Смета "${estimate.name}" успешно обновлена`)
      } else {
        // Создаем новую смету
        const estimateName = `Смета от ${new Date().toLocaleDateString('ru-RU')}`

        const { data: estimate, error: estimateError } = await supabase
          .from('estimate_drafts')
          .insert({
            project_id: selectedProject,
            name: estimateName,
            status: 'final', // Статус "final" для финальной сметы
            data: {
              positions,
              totalCost,
              createdAt: new Date().toISOString(),
            },
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .select()
          .single()

        if (estimateError) {
          throw estimateError
        }

        console.log('Estimate created successfully:', {
          id: estimate.id,
          name: estimateName,
          totalCost,
          positionsCount: positions.length,
        })

        message.success(`Смета "${estimateName}" успешно сохранена`)

        // Очищаем после создания новой сметы
        setCurrentDraftId(null)
        setDraftName('')
        setPositions([])
      }
    } catch (error) {
      console.error('Error saving estimate:', error)
      message.error('Ошибка при сохранении сметы')
    } finally {
      setIsSaving(false)
    }
  }

  // Функция импорта расценок из сборника
  const handleImportFromRates = () => {
    console.log('Importing from rates collection...')

    if (ratesLoading || rateMaterialsLoading) {
      message.warning('Данные еще загружаются...')
      return
    }

    if (!rates.length) {
      message.warning('Нет расценок в сборнике для импорта')
      return
    }

    // Конвертируем расценки в позиции сметы
    const newPositions: EstimatePosition[] = rates.map((rate, index) => {
      const materials = allRateMaterials[rate.id] || []

      // Создаем подрядчика (группу)
      const contractorPosition: EstimatePosition = {
        id: `rate-${rate.id}`,
        number: `${positions.length + index + 1}`,
        justification: 'подрядчик',
        workName: rate.name,
        unit: rate.unit_short_name || 'компл',
        volume: 1,
        workPrice: 0,
        total: 0, // Будет пересчитан
        level: 0,
        expanded: false,
        created_at: new Date().toISOString(),
        children: [],
      }

      // Добавляем работу
      const workPosition: EstimatePosition = {
        id: `rate-work-${rate.id}`,
        number: `${positions.length + index + 1}.1`,
        parentId: contractorPosition.id,
        justification: 'раб',
        workName: rate.name,
        unit: rate.unit_short_name || 'ед',
        volume: 1,
        workPrice: rate.base_price || 0,
        total: rate.base_price || 0,
        level: 1,
        created_at: new Date().toISOString(),
      }

      contractorPosition.children?.push(workPosition)
      let totalCost = rate.base_price || 0

      // Добавляем материалы
      materials.forEach((material, matIndex) => {
        const volume = material.consumption || 1
        const price = material.unit_price || 0
        const materialTotal = volume * price

        const materialPosition: EstimatePosition = {
          id: `rate-mat-${rate.id}-${matIndex}`,
          number: `${positions.length + index + 1}.${matIndex + 2}`,
          parentId: contractorPosition.id,
          justification: 'мат',
          materialType: materialTypes[0]?.short_name || 'основ',
          workName: material.material?.name || 'Материал',
          unit: material.material?.unit_short_name || 'ед',
          volume: volume,
          materialNorm: material.consumption || 1,
          workPrice: 0,
          materialPrice: price,
          deliveryPrice: 0,
          total: materialTotal,
          level: 1,
          created_at: new Date().toISOString(),
        }

        contractorPosition.children?.push(materialPosition)
        totalCost += materialTotal
      })

      // Обновляем общую стоимость группы
      contractorPosition.total = totalCost

      return contractorPosition
    })

    // Добавляем новые позиции к существующим
    setPositions([...positions, ...newPositions])

    // Отмечаем все импортированные расценки как измененные
    setModifiedPositions(prev => {
      const newSet = new Set(prev)
      newPositions.forEach(pos => {
        newSet.add(pos.id)
        pos.children?.forEach(child => newSet.add(child.id))
      })
      return newSet
    })

    message.success(`Импортировано ${rates.length} расценок из сборника`)
    console.log('Imported rates:', newPositions)
  }

  // Функция импорта CSV
  const handleImportCSV = () => {
    console.log('📥 Import CSV clicked - opening file dialog')
    fileInputRef.current?.click()
  }

  const handleExportCSV = () => {
    handleExport()
  }

  const findPositionById = (
    positions: EstimatePosition[],
    id: string
  ): EstimatePosition | null => {
    for (const position of positions) {
      if (position.id === id) {
        return position
      }
      if (position.children) {
        const found = findPositionById(position.children, id)
        if (found) return found
      }
    }
    return null
  }

  const handleToggleExpanded = useCallback(
    (id: string) => {
      const toggleExpanded = (
        positions: EstimatePosition[]
      ): EstimatePosition[] => {
        return positions.map(position => {
          if (position.id === id) {
            return { ...position, expanded: !position.expanded }
          }
          if (position.children) {
            return {
              ...position,
              children: toggleExpanded(position.children),
            }
          }
          return position
        })
      }

      setPositions(toggleExpanded(positions))
      console.log('Position expanded toggled:', { positionId: id })
    },
    [positions]
  )

  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const handleImport = () => {
    console.log('📂 Import clicked - opening file dialog')
    fileInputRef.current?.click()
  }

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) {
      console.log('❌ No file selected')
      return
    }

    console.log('📄 File selected:', file.name, file.type, file.size, 'bytes')

    if (!file.name.toLowerCase().endsWith('.csv')) {
      message.error('Пожалуйста, выберите CSV файл')
      return
    }

    const reader = new window.FileReader()
    reader.onload = e => {
      try {
        const csvContent = e.target?.result as string
        console.log('📋 CSV content loaded, length:', csvContent.length)

        const importedPositions = parseCSVToPositions(csvContent)
        console.log('✅ Parsed positions:', importedPositions.length)

        if (importedPositions.length > 0) {
          setPositions(importedPositions)
          setSelectedPositions([])

          // Отмечаем все импортированные позиции как измененные
          setModifiedPositions(prev => {
            const newSet = new Set(prev)
            importedPositions.forEach(pos => {
              newSet.add(pos.id)
              pos.children?.forEach(child => newSet.add(child.id))
            })
            return newSet
          })

          message.success(
            `Импортировано ${importedPositions.length} позиций из ${file.name}`
          )
          console.log('🎉 Import completed successfully')
        } else {
          message.warning('В файле не найдены валидные данные')
        }
      } catch (error) {
        console.error('❌ Import error:', error)
        message.error('Ошибка при импорте файла')
      }
    }

    reader.onerror = () => {
      console.error('❌ File reading error')
      message.error('Ошибка при чтении файла')
    }

    reader.readAsText(file, 'utf-8')

    // Очищаем input для возможности повторного выбора того же файла
    event.target.value = ''
  }

  // Функция для парсинга CSV из Google Sheets (упрощенная версия)
  const parseGoogleSheetsCSV = (csvContent: string): EstimatePosition[] => {
    const lines = csvContent.split('\n').filter(line => line.trim())
    console.log('📊 Google Sheets CSV full content preview:')
    console.log(csvContent.substring(0, 500) + '...')
    console.log('📊 Google Sheets CSV lines count:', lines.length)

    if (lines.length < 1) {
      console.log('❌ Not enough lines in Google Sheets CSV')
      return []
    }

    const positions: EstimatePosition[] = []

    // Обрабатываем каждую строку
    lines.forEach((line, i) => {
      const columns = parseCSVLine(line.trim())

      console.log(`📝 Строка ${i + 1}:`, {
        rawLine: line.substring(0, 100),
        columns: columns,
        columnCount: columns.length,
      })

      // Пропускаем пустые строки
      if (columns.length === 0 || columns.every(col => !col || !col.trim())) {
        console.log(`⏭️ Пропускаем пустую строку ${i + 1}`)
        return
      }

      // Пропускаем очевидные заголовки
      const firstCol = columns[0]?.toLowerCase() || ''
      if (
        firstCol.includes('номер') ||
        firstCol.includes('№') ||
        firstCol.includes('наименование')
      ) {
        console.log(`⏭️ Пропускаем заголовок строку ${i + 1}: ${firstCol}`)
        return
      }

      try {
        // Простая логика: берем первые непустые колонки
        let workName = ''
        let unit = 'шт'
        let volume = 1
        let price = 0
        let total = 0

        // Ищем первую непустую колонку как наименование
        for (let j = 0; j < columns.length; j++) {
          const col = columns[j]?.trim()
          if (col && col.length > 2 && !col.match(/^\d+[.,]?\d*$/)) {
            workName = col
            console.log(`📌 Найдено наименование в колонке ${j}: "${workName}"`)
            break
          }
        }

        if (!workName) {
          console.log(`⚠️ Не найдено наименование в строке ${i + 1}`)
          return
        }

        // Ищем числовые значения
        const numbers = []
        for (let j = 0; j < columns.length; j++) {
          const col = columns[j]?.trim()
          if (col && col.match(/^\d+[.,]?\d*$/)) {
            const num = parseFloat(col.replace(',', '.'))
            if (!isNaN(num)) {
              numbers.push({ value: num, index: j })
            }
          }
        }

        console.log(`🔢 Найденные числа в строке ${i + 1}:`, numbers)

        // Назначаем числа по порядку: объем, цена, итого
        if (numbers.length >= 1) volume = numbers[0].value
        if (numbers.length >= 2) price = numbers[1].value
        if (numbers.length >= 3) total = numbers[2].value || volume * price

        // Если итого не указано, рассчитываем
        if (total === 0 && volume > 0 && price > 0) {
          total = volume * price
        }

        // Ищем единицу измерения
        const commonUnits = [
          'м',
          'м²',
          'м³',
          'м2',
          'м3',
          'кг',
          'т',
          'шт',
          'л',
          'компл',
          'ед',
        ]
        for (let j = 0; j < columns.length; j++) {
          const col = columns[j]?.trim()?.toLowerCase()
          if (col && commonUnits.includes(col)) {
            unit = col
            break
          }
        }

        // Определяем тип позиции
        const workNameLower = workName.toLowerCase()
        let justification: 'подрядчик' | 'раб' | 'мат' = 'раб'
        let materialType: 'основа' | 'вспом' | undefined = undefined

        if (
          workNameLower.includes('материал') ||
          workNameLower.includes('бетон') ||
          workNameLower.includes('кирпич') ||
          workNameLower.includes('цемент')
        ) {
          justification = 'мат'
          materialType = 'основа'
        } else if (
          workNameLower.includes('раздел') ||
          workNameLower.includes('итого')
        ) {
          justification = 'подрядчик'
        }

        const position: EstimatePosition = {
          id: `gs-${Date.now()}-${i}`,
          number: (i + 1).toString(),
          justification,
          materialType,
          workName,
          unit,
          volume,
          workPrice: price,
          total,
          level: justification === 'подрядчик' ? 0 : 1,
          created_at: new Date().toISOString(),
        }

        positions.push(position)

        console.log(`✅ Создана позиция ${i + 1}:`, {
          workName: position.workName,
          justification: position.justification,
          unit: position.unit,
          volume: position.volume,
          price: position.workPrice,
          total: position.total,
        })
      } catch (error) {
        console.error(`❌ Ошибка обработки строки ${i + 1}:`, error, line)
      }
    })

    console.log(`📈 Итого импортировано позиций: ${positions.length}`)
    return positions
  }

  const parseCSVToPositions = (csvContent: string): EstimatePosition[] => {
    const lines = csvContent.split('\n').filter(line => line.trim())
    console.log('📊 CSV lines count:', lines.length)

    if (lines.length < 2) {
      console.log('❌ Not enough lines in CSV')
      return []
    }

    const positions: EstimatePosition[] = []

    // Пропускаем заголовок (первую строку)
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim()
      if (!line) continue

      // Парсим CSV строку (учитываем запятые в кавычках)
      const columns = parseCSVLine(line)
      console.log(`🔍 Line ${i}:`, columns)

      if (columns.length < 4) {
        console.log(`⚠️ Skipping line ${i} - not enough columns`)
        continue
      }

      try {
        const position: EstimatePosition = {
          id: `imported-${Date.now()}-${i}`,
          number: columns[0] || `${positions.length + 1}`,
          justification: getValidJustification(columns[1]),
          materialType: columns[2]
            ? (columns[2] as 'основа' | 'вспом')
            : undefined,
          workName: columns[3] || `Позиция ${i}`,
          unit: columns[4] || 'шт',
          volume: parseFloat(columns[5]) || 1,
          materialNorm: columns[6] ? parseFloat(columns[6]) : undefined,
          workPrice: parseFloat(columns[7]) || 0,
          materialPrice: columns[8] ? parseFloat(columns[8]) : undefined,
          deliveryPrice: columns[9] ? parseFloat(columns[9]) : undefined,
          total: parseFloat(columns[10]) || 0,
          level: 0,
          created_at: new Date().toISOString(),
        }

        // Если total не указан, рассчитываем автоматически
        if (!position.total && position.volume && position.workPrice) {
          position.total = position.volume * position.workPrice
        }

        positions.push(position)
        console.log(`✅ Added position:`, position.workName)
      } catch (error) {
        console.error(`❌ Error parsing line ${i}:`, error)
      }
    }

    return positions
  }

  const parseCSVLine = (line: string): string[] => {
    const result: string[] = []
    let current = ''
    let inQuotes = false

    for (let i = 0; i < line.length; i++) {
      const char = line[i]

      if (char === '"') {
        inQuotes = !inQuotes
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim())
        current = ''
      } else {
        current += char
      }
    }

    result.push(current.trim())
    return result
  }

  const getValidJustification = (
    value: string
  ): 'подрядчик' | 'раб' | 'мат' => {
    const normalized = value?.toLowerCase().trim()
    if (normalized?.includes('подрядчик') || normalized?.includes('заказчик'))
      return 'подрядчик'
    if (normalized?.includes('раб')) return 'раб'
    if (normalized?.includes('мат')) return 'мат'
    return 'раб' // по умолчанию
  }

  const handleExport = () => {
    console.log('💾 Export clicked')

    if (positions.length === 0) {
      message.warning('Нет данных для экспорта')
      return
    }

    try {
      const csvContent = generateCSVContent()
      const blob = new window.Blob([csvContent], {
        type: 'text/csv;charset=utf-8;',
      })
      const link = document.createElement('a')
      const url = URL.createObjectURL(blob)

      link.setAttribute('href', url)
      link.setAttribute(
        'download',
        `smeta_${new Date().toISOString().split('T')[0]}.csv`
      )
      link.style.visibility = 'hidden'

      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      message.success('Файл CSV успешно экспортирован')
      console.log('✅ Export completed successfully')
    } catch (error) {
      console.error('❌ Export error:', error)
      message.error('Ошибка при экспорте файла')
    }
  }

  const generateCSVContent = (): string => {
    const headers = [
      '№ п/п',
      'Обоснование',
      'Тип материала',
      'Наименование работ',
      'Ед. изм.',
      'Объем',
      'Норма расхода мат-лов',
      'Цена работ за ед.изм.',
      'Цена мат-лов',
      'Поставка материалов',
      'Итого',
    ]

    const rows: string[] = [headers.join(',')]

    const addPositionToCSV = (position: EstimatePosition) => {
      const row = [
        `"${position.number}"`,
        `"${position.justification}"`,
        `"${position.materialType || ''}"`,
        `"${position.workName}"`,
        `"${position.unit}"`,
        position.volume.toString(),
        (position.materialNorm || '').toString(),
        position.workPrice.toString(),
        (position.materialPrice || '').toString(),
        (position.deliveryPrice || '').toString(),
        position.total.toString(),
      ]
      rows.push(row.join(','))

      // Добавляем дочерние позиции
      if (position.children) {
        position.children.forEach(child => addPositionToCSV(child))
      }
    }

    positions.forEach(position => addPositionToCSV(position))

    console.log('📝 Generated CSV with', rows.length - 1, 'data rows')
    return rows.join('\n')
  }

  const handleDownloadSample = () => {
    console.log('📋 Download sample CSV clicked')

    const sampleCSV = `№ п/п,Обоснование,Тип материала,Наименование работ,Ед. изм.,Объем,Норма расхода мат-лов,Цена работ за ед.изм.,Цена мат-лов,Поставка материалов,Итого
"1","подрядчик","","Земляные работы","компл",1,0,0,0,0,100000
"1.1","раб","","Разработка грунта экскаватором","м³",500,0,200,0,0,100000
"1.2","мат","основ","Песок карьерный","м³",50,1,0,800,50,42500
"2","подрядчик","","Бетонные работы","компл",1,0,0,0,0,450000
"2.1","раб","","Устройство фундамента","м³",100,0,3500,0,0,350000
"2.2","мат","основ","Бетон B25","м³",100,1.05,0,5500,275,577500
"2.3","мат","вспом","Арматура А500С","кг",2500,1,0,85,5,225000
"3","подрядчик","","Арматурные работы","компл",1,,0,,,162500
"3.1","раб","","Вязка арматуры","кг",2500,,25,,,62500
"3.2","мат","основа","Арматура А500С d12","кг",2500,1.02,0,65,3.25,100000`

    const blob = new window.Blob([sampleCSV], {
      type: 'text/csv;charset=utf-8;',
    })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)

    link.setAttribute('href', url)
    link.setAttribute('download', 'sample_smeta.csv')
    link.style.visibility = 'hidden'

    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    message.success('Пример CSV файла скачан')
    console.log('✅ Sample CSV downloaded')
  }

  const handleRestoreTestData = () => {
    const testData: EstimatePosition[] = [
      {
        id: '1',
        number: '1',
        justification: 'подрядчик',
        workName: 'Строительные работы',
        unit: 'компл',
        volume: 1,
        workPrice: 0,
        total: 712500,
        level: 0,
        expanded: true,
        created_at: '2024-01-15T10:00:00Z',
        children: [
          {
            id: '1.1',
            number: '1.1',
            parentId: '1',
            justification: 'раб',
            workName: 'Устройство фундамента',
            unit: 'м³',
            volume: 100,
            workPrice: 3500,
            total: 350000,
            level: 1,
            created_at: '2024-01-15T10:00:00Z',
          },
          {
            id: '1.2',
            number: '1.2',
            parentId: '1',
            justification: 'мат',
            materialType: materialTypes[0]?.short_name || 'основ',
            workName: 'Бетон B25',
            unit: 'м³',
            volume: 100,
            materialNorm: 1.05,
            workPrice: 5500,
            materialPrice: 5500,
            deliveryPrice: 275,
            total: 550000,
            level: 1,
            created_at: '2024-01-15T10:00:00Z',
          },
        ],
      },
      {
        id: '2',
        number: '2',
        justification: 'подрядчик',
        workName: 'Арматурные работы',
        unit: 'компл',
        volume: 1,
        workPrice: 0,
        total: 162500,
        level: 0,
        expanded: false,
        created_at: '2024-01-16T14:30:00Z',
        children: [
          {
            id: '2.1',
            number: '2.1',
            parentId: '2',
            justification: 'раб',
            workName: 'Вязка арматуры',
            unit: 'кг',
            volume: 2500,
            workPrice: 25,
            total: 62500,
            level: 1,
            created_at: '2024-01-16T14:30:00Z',
          },
          {
            id: '2.2',
            number: '2.2',
            parentId: '2',
            justification: 'мат',
            materialType: materialTypes[0]?.short_name || 'основ',
            workName: 'Арматура А500С d12',
            unit: 'кг',
            volume: 2500,
            materialNorm: 1.02,
            workPrice: 40,
            materialPrice: 65,
            deliveryPrice: 3.25,
            total: 100000,
            level: 1,
            created_at: '2024-01-16T14:30:00Z',
          },
        ],
      },
    ]

    setPositions(testData)
    setSelectedPositions([])
    message.success('Тестовые данные восстановлены')
    console.log('🔄 Test data restored')
  }

  // Сбрасываем некорректные выборы при рендере
  const validSelectedPositions = selectedPositions.filter(
    id => findPositionById(positions, id) !== null
  )

  if (validSelectedPositions.length !== selectedPositions.length) {
    console.log('🧹 Cleaning up invalid selections')
    setSelectedPositions(validSelectedPositions)
  }

  // Логирование только при изменении количества позиций
  const prevPositionsCount = useRef(positions.length)
  if (prevPositionsCount.current !== positions.length) {
    console.log('📊 TenderTest positions changed:', {
      from: prevPositionsCount.current,
      to: positions.length,
      timestamp: new Date().toISOString(),
    })
    prevPositionsCount.current = positions.length
  }

  // Конфигурация вкладок
  const tabItems: TabsProps['items'] = [
    {
      key: 'table',
      label: (
        <span>
          <TableOutlined />
          Табличный режим
        </span>
      ),
      children: (
        <div
          style={{
            height: 'calc(100vh - 200px)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          {/* Весь существующий интерфейс таблицы */}
          <div style={{ flexShrink: 0, paddingBottom: 16 }}>
            {/* Предупреждение о необходимости выбора проекта */}
            {!selectedProject && positions.length > 0 && (
              <Card
                size="small"
                style={{
                  marginBottom: 8,
                  backgroundColor: '#fff7e6',
                  borderColor: '#ffa940',
                }}
              >
                <div style={{ color: '#fa8c16', textAlign: 'center' }}>
                  ⚠️ Выберите проект для активации кнопок сохранения
                </div>
              </Card>
            )}

            <Card size="small" style={{ marginBottom: 16 }}>
              <Row gutter={16} align="middle">
                <Col span={6}>
                  <Select
                    placeholder="Выберите проект"
                    style={{ width: '100%' }}
                    allowClear
                    showSearch
                    value={selectedProject}
                    onChange={value => {
                      console.log('📂 Project changed to:', value)
                      setSelectedProject(value)
                      // НЕ сбрасываем черновик здесь - он будет загружен в useEffect
                      // setCurrentDraftId(null)
                      // setDraftName('')
                    }}
                    loading={projectsLoading}
                    filterOption={(input, option) => {
                      const text =
                        (option?.children || option?.label)?.toString() || ''
                      return text.toLowerCase().includes(input.toLowerCase())
                    }}
                  >
                    {projects.map(project => (
                      <Option key={project.id} value={project.id}>
                        {project.name} - {project.description || 'Без описания'}
                      </Option>
                    ))}
                  </Select>
                </Col>
                <Col span={6}>
                  <Input
                    placeholder="Поиск..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    allowClear
                  />
                </Col>
                <Col span={4}>
                  {selectedProject && drafts.length > 0 && (
                    <Select
                      placeholder="Загрузить черновик"
                      style={{ width: '100%' }}
                      allowClear
                      showSearch
                      value={currentDraftId}
                      onChange={async draftId => {
                        if (!draftId) {
                          setCurrentDraftId(null)
                          setDraftName('')
                          return
                        }

                        const draft = drafts.find(d => d.id === draftId)
                        if (draft && draft.data) {
                          const loadedPositions = draft.data.positions || []
                          // Очищаем флаги isEdited при загрузке
                          const cleanPositions = (
                            items: EstimatePosition[]
                          ): EstimatePosition[] => {
                            return items.map(item => ({
                              ...item,
                              isEdited: false,
                              children: item.children
                                ? cleanPositions(item.children)
                                : undefined,
                            }))
                          }
                          setPositions(cleanPositions(loadedPositions))
                          setCurrentDraftId(draft.id)
                          setDraftName(draft.name)
                          setModifiedPositions(new Set())
                          message.success('Черновик загружен')
                        }
                      }}
                      loading={draftsLoading}
                      filterOption={(input, option) => {
                        const text =
                          (option?.children || option?.label)?.toString() || ''
                        return text.toLowerCase().includes(input.toLowerCase())
                      }}
                    >
                      {drafts.map(draft => (
                        <Option key={draft.id} value={draft.id}>
                          {draft.name} (
                          {new Date(draft.updated_at).toLocaleDateString()})
                        </Option>
                      ))}
                    </Select>
                  )}
                </Col>
                <Col span={8}>
                  <Space
                    direction="vertical"
                    size="small"
                    style={{ width: '100%' }}
                  >
                    {/* Группа 1: Добавление и Импорт */}
                    <Space.Compact style={{ display: 'flex' }}>
                      <Button
                        type="primary"
                        icon={<PlusOutlined />}
                        onClick={() => handlePositionAddClick()}
                      >
                        Добавить
                      </Button>
                      <Button
                        icon={<DatabaseOutlined />}
                        onClick={handleImportFromRates}
                        loading={ratesLoading || rateMaterialsLoading}
                        style={{
                          backgroundColor: '#52c41a',
                          color: 'white',
                          borderColor: '#52c41a',
                        }}
                      >
                        Из сборника
                      </Button>
                      <Button
                        icon={<GoogleOutlined />}
                        onClick={() => setGoogleSheetsModalVisible(true)}
                        style={{
                          backgroundColor: '#4285f4',
                          color: 'white',
                          borderColor: '#4285f4',
                        }}
                        title="Импорт из Google Sheets по ссылке"
                      >
                        Google Sheets
                      </Button>
                    </Space.Compact>

                    {/* Группа 2: Файловые операции и Сохранение */}
                    <Space.Compact style={{ display: 'flex' }}>
                      <Button
                        icon={<UploadOutlined />}
                        onClick={handleImportCSV}
                      >
                        Импорт CSV
                      </Button>
                      <Button
                        icon={<DownloadOutlined />}
                        onClick={handleExportCSV}
                      >
                        Экспорт
                      </Button>
                      <Button
                        type="primary"
                        icon={<SaveOutlined />}
                        onClick={handleSaveEstimate}
                        loading={isSaving}
                        disabled={!selectedProject || positions.length === 0}
                        title={
                          !selectedProject
                            ? 'Выберите проект для сохранения'
                            : positions.length === 0
                              ? 'Нет данных для сохранения'
                              : ''
                        }
                      >
                        Сохранить
                      </Button>
                      <Button
                        type={
                          modifiedPositions.size > 0 ? 'primary' : 'default'
                        }
                        icon={<SaveOutlined />}
                        onClick={handleSaveChanges}
                        loading={isSavingChanges}
                        disabled={!selectedProject || positions.length === 0}
                        danger={modifiedPositions.size > 0}
                        title={
                          !selectedProject
                            ? 'Выберите проект для сохранения черновика'
                            : positions.length === 0
                              ? 'Нет данных для сохранения'
                              : ''
                        }
                        style={
                          modifiedPositions.size > 0
                            ? {
                                backgroundColor: '#ff4d4f',
                                borderColor: '#ff4d4f',
                                color: 'white',
                              }
                            : {}
                        }
                      >
                        {currentDraftId
                          ? `Черновик${modifiedPositions.size > 0 ? ` (${modifiedPositions.size})` : ''}`
                          : `Черновик${modifiedPositions.size > 0 ? ` (${modifiedPositions.size})` : ''}`}
                      </Button>
                    </Space.Compact>
                  </Space>
                </Col>
              </Row>
            </Card>
          </div>

          <div style={{ flex: 1, overflow: 'hidden', minHeight: 0 }}>
            <EstimateTable
              positions={positions}
              onPositionUpdate={handlePositionUpdate}
              onPositionAdd={handlePositionAddClick}
              onPositionDelete={handlePositionDelete}
              onToggleExpanded={handleToggleExpanded}
              selectedPositions={selectedPositions}
              onSelectionChange={setSelectedPositions}
              searchTerm={searchTerm}
              editingCell={editingCell}
              onEditingCellChange={setEditingCell}
            />
          </div>
        </div>
      ),
    },
  ]

  return (
    <div style={{ height: 'calc(100vh - 96px)', padding: '16px 0' }}>
      {/* Скрытый input для выбора файлов */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv"
        style={{ display: 'none' }}
        onChange={handleFileSelect}
      />

      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        items={tabItems}
        size="large"
        style={{ height: '100%' }}
      />

      {/* Модальное окно добавления позиции: из сборника или вручную */}
      <Modal
        title={
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <span>Добавить новую позицию</span>
            <Space size="small">
              <Button
                type={addMode === 'rate' ? 'primary' : 'default'}
                size="small"
                icon={<DatabaseOutlined />}
                onClick={() => {
                  setAddMode('rate')
                  setSelectedRateId(null)
                }}
              >
                Из сборника
              </Button>
              <Button
                type={addMode === 'manual' ? 'primary' : 'default'}
                size="small"
                icon={<PlusOutlined />}
                onClick={() => setAddMode('manual')}
              >
                Вручную
              </Button>
            </Space>
          </div>
        }
        open={addPositionModalVisible}
        onOk={handleConfirmAddPosition}
        onCancel={() => {
          setAddPositionModalVisible(false)
          setPendingParentId(undefined)
          setSelectedRateId(null)
          setRateSearchTerm('')
          setAddMode('rate')
        }}
        okText={
          addMode === 'rate'
            ? selectedRateId
              ? 'Добавить расценку'
              : 'Выберите расценку'
            : 'Создать'
        }
        okButtonProps={{ disabled: addMode === 'rate' && !selectedRateId }}
        cancelText="Отмена"
        width={addMode === 'rate' ? 900 : 600}
      >
        {addMode === 'rate' ? (
          <div>
            <div style={{ marginBottom: 16 }}>
              <RateAutocomplete
                rates={rates}
                onSelect={rate => {
                  setSelectedRateId(rate.id)
                  console.log('📋 Расценка выбрана из автокомплита:', {
                    id: rate.id,
                    code: rate.code,
                    name: rate.name,
                    price: rate.base_price,
                    timestamp: new Date().toISOString(),
                  })
                }}
                placeholder="🔍 Поиск по коду или наименованию расценки..."
              />
              {rateMaterialsLoading && (
                <div
                  style={{
                    fontSize: 12,
                    color: '#1677ff',
                    textAlign: 'right',
                    marginTop: 8,
                  }}
                >
                  ⏳ Загрузка материалов для расценок...
                </div>
              )}
            </div>

            <div
              style={{
                maxHeight: '500px',
                overflowY: 'auto',
                border: '1px solid #e8e8e8',
                borderRadius: 8,
                padding: 8,
              }}
            >
              {ratesLoading ? (
                <div
                  style={{
                    textAlign: 'center',
                    padding: '40px',
                    color: '#999',
                  }}
                >
                  Загрузка расценок...
                </div>
              ) : rates.length === 0 ? (
                <div
                  style={{
                    textAlign: 'center',
                    padding: '40px',
                    color: '#999',
                  }}
                >
                  <DatabaseOutlined
                    style={{ fontSize: 48, marginBottom: 16 }}
                  />
                  <div>Сборник расценок пуст</div>
                  <div style={{ fontSize: 12, marginTop: 8 }}>
                    Добавьте расценки на странице "Расценки"
                  </div>
                </div>
              ) : (
                rates
                  .filter(
                    rate =>
                      !rateSearchTerm ||
                      rate.code
                        ?.toLowerCase()
                        .includes(rateSearchTerm.toLowerCase()) ||
                      rate.name
                        .toLowerCase()
                        .includes(rateSearchTerm.toLowerCase())
                  )
                  .map(rate => {
                    const isSelected = selectedRateId === rate.id
                    const materials = allRateMaterials[rate.id] || []

                    return (
                      <Card
                        key={rate.id}
                        size="small"
                        style={{
                          marginBottom: 12,
                          cursor: 'pointer',
                          border: isSelected
                            ? '2px solid #1677ff'
                            : '1px solid #e8e8e8',
                          background: isSelected ? '#f0f7ff' : 'white',
                          transition: 'all 0.2s',
                        }}
                        onClick={() => setSelectedRateId(rate.id)}
                        hoverable
                      >
                        <div
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'start',
                          }}
                        >
                          <div style={{ flex: 1 }}>
                            <div
                              style={{
                                fontWeight: 600,
                                color: '#1677ff',
                                marginBottom: 6,
                              }}
                            >
                              {rate.code || 'Без кода'}
                            </div>
                            <div
                              style={{
                                color: '#333',
                                fontSize: 15,
                                fontWeight: 500,
                                marginBottom: 8,
                              }}
                            >
                              {rate.name}
                            </div>
                            <Space size="small" style={{ flexWrap: 'wrap' }}>
                              <span
                                style={{
                                  background: '#f0f0f0',
                                  padding: '2px 8px',
                                  borderRadius: 4,
                                  fontSize: 12,
                                  color: '#666',
                                }}
                              >
                                📏{' '}
                                {typeof rate.unit === 'string'
                                  ? rate.unit
                                  : rate.unit?.short_name || 'ед'}
                              </span>
                              {materials.length > 0 && (
                                <span
                                  style={{
                                    background: '#e6f7ff',
                                    padding: '2px 8px',
                                    borderRadius: 4,
                                    fontSize: 12,
                                    color: '#1677ff',
                                  }}
                                >
                                  🧱 {materials.length}{' '}
                                  {materials.length === 1
                                    ? 'материал'
                                    : 'материалов'}
                                </span>
                              )}
                            </Space>
                          </div>
                          <div
                            style={{
                              textAlign: 'right',
                              fontWeight: 700,
                              color: '#1677ff',
                              fontSize: 20,
                            }}
                          >
                            {(rate.unit_price || 0).toLocaleString('ru-RU')} ₽
                          </div>
                        </div>
                      </Card>
                    )
                  })
              )}
            </div>

            {selectedRateId && (
              <div
                style={{
                  marginTop: 16,
                  padding: 12,
                  background: '#f0f7ff',
                  borderRadius: 8,
                  border: '1px solid #91d5ff',
                }}
              >
                <div style={{ color: '#1677ff', fontWeight: 600 }}>
                  ✓ Выбрана расценка:{' '}
                  {rates.find(r => r.id === selectedRateId)?.name}
                </div>
                <div style={{ fontSize: 12, color: '#666', marginTop: 4 }}>
                  Будет создана позиция с работами
                  {allRateMaterials[selectedRateId]?.length > 0 &&
                    ` и ${allRateMaterials[selectedRateId].length} материалами`}
                </div>

                {/* Список материалов */}
                {allRateMaterials[selectedRateId]?.length > 0 && (
                  <div
                    style={{
                      marginTop: 12,
                      padding: 8,
                      background: 'white',
                      borderRadius: 6,
                    }}
                  >
                    <div
                      style={{
                        fontSize: 12,
                        fontWeight: 600,
                        marginBottom: 8,
                        color: '#666',
                      }}
                    >
                      Материалы в расценке:
                    </div>
                    {allRateMaterials[selectedRateId].map(
                      (rm: any, index: number) => (
                        <div
                          key={index}
                          style={{
                            fontSize: 12,
                            padding: '4px 8px',
                            marginBottom: 4,
                            background: '#fafafa',
                            borderRadius: 4,
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                          }}
                        >
                          <div style={{ flex: 1 }}>
                            <span style={{ color: '#1677ff' }}>
                              {rm.materials?.name || 'Материал'}
                            </span>
                            <span style={{ color: '#999', marginLeft: 8 }}>
                              ({rm.materials?.unit_short_name || 'ед'})
                            </span>
                          </div>
                          <div style={{ color: '#666' }}>
                            Расход: {rm.consumption || 1}
                          </div>
                        </div>
                      )
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          <Form layout="vertical">
            <Form.Item label="Количество материалов">
              <InputNumber
                min={0}
                max={20}
                value={materialsCount}
                onChange={value => setMaterialsCount(value || 0)}
                style={{ width: '100%' }}
                addonAfter="материалов"
              />
              <div style={{ marginTop: 8, color: '#666', fontSize: 12 }}>
                Будет создано: 1 позиция "Заказчик", 1 позиция "Работы" и{' '}
                {materialsCount}{' '}
                {materialsCount === 1
                  ? 'материал'
                  : materialsCount > 1 && materialsCount < 5
                    ? 'материала'
                    : 'материалов'}
              </div>
              <div style={{ marginTop: 4, color: '#999', fontSize: 12 }}>
                Вы сможете добавить или удалить материалы после создания
              </div>
            </Form.Item>
          </Form>
        )}
      </Modal>

      {/* Модальное окно для импорта из Google Sheets */}
      <Modal
        title={
          <span>
            <GoogleOutlined style={{ marginRight: 8, color: '#4285f4' }} />
            Импорт сметы из Google Sheets
          </span>
        }
        open={googleSheetsModalVisible}
        onCancel={() => {
          setGoogleSheetsModalVisible(false)
          setGoogleSheetsUrl('')
        }}
        width={800}
        footer={[
          <Button
            key="cancel"
            onClick={() => {
              setGoogleSheetsModalVisible(false)
              setGoogleSheetsUrl('')
            }}
          >
            Отмена
          </Button>,
          <Button
            key="import"
            type="primary"
            icon={<DownloadOutlined />}
            loading={isAnalyzingSheet}
            onClick={() => handleServerImport()}
            disabled={!googleSheetsUrl.trim()}
          >
            Импортировать
          </Button>,
        ]}
      >
        <Space direction="vertical" style={{ width: '100%' }} size="large">
          <div>
            <h4>Инструкция по импорту:</h4>
            <ol>
              <li>Откройте Google Sheets документ со сметой</li>
              <li>Скопируйте полную ссылку из адресной строки браузера</li>
              <li>Вставьте ссылку в поле ниже</li>
              <li>Нажмите "Импортировать"</li>
            </ol>
          </div>

          <Input
            size="large"
            placeholder="https://docs.google.com/spreadsheets/d/..."
            prefix={<LinkOutlined />}
            value={googleSheetsUrl}
            onChange={e => setGoogleSheetsUrl(e.target.value)}
          />

          <Card
            size="small"
            style={{ backgroundColor: '#f0f9ff', borderColor: '#0ea5e9' }}
          >
            <h4 style={{ color: '#0ea5e9' }}>⚙️ Настройка доступа:</h4>
            <ol style={{ marginBottom: 8, fontSize: '12px' }}>
              <li>
                <strong>Откройте Google Sheets</strong>
              </li>
              <li>
                Нажмите <strong>"Файл" → "Опубликовать в интернете"</strong>
              </li>
              <li>
                Выберите <strong>"Весь документ"</strong> и формат{' '}
                <strong>"Веб-страница"</strong>
              </li>
              <li>
                Нажмите <strong>"Опубликовать"</strong>
              </li>
              <li>Скопируйте ссылку и вставьте ниже</li>
            </ol>
          </Card>

          <Card size="small" style={{ backgroundColor: '#f5f5f5' }}>
            <h4>Что будет импортировано:</h4>
            <ul style={{ marginBottom: 0, fontSize: '12px' }}>
              <li>
                <strong>Все строки файла</strong> - каждая строка станет
                отдельной позицией
              </li>
              <li>
                Автоматическое определение типа позиции
                (работа/материал/подрядчик)
              </li>
              <li>Наименования работ и материалов</li>
              <li>Единицы измерения, объемы и цены</li>
              <li>Расчетные итоги для каждой позиции</li>
            </ul>
          </Card>

          <Card size="small" style={{ backgroundColor: '#e6f7ff' }}>
            <h4>Поддерживаемые форматы смет:</h4>
            <ul style={{ marginBottom: 0 }}>
              <li>Локальные сметы</li>
              <li>Объектные сметы</li>
              <li>Сводные сметные расчеты</li>
              <li>Акты выполненных работ (КС-2, КС-3)</li>
              <li>Спецификации материалов</li>
            </ul>
          </Card>

          {isAnalyzingSheet && (
            <Card size="small" style={{ backgroundColor: '#fff7e6' }}>
              <h4>Процесс анализа:</h4>
              <ol style={{ marginBottom: 0 }}>
                <li>Подключение к документу...</li>
                <li>Анализ структуры таблицы...</li>
                <li>Извлечение данных...</li>
                <li>Преобразование в формат портала...</li>
              </ol>
            </Card>
          )}
        </Space>
      </Modal>
    </div>
  )
}
