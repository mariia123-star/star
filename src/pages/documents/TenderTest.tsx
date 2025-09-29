import { useState, useRef, useEffect, useCallback } from 'react'
import { Card, Button, Space, Input, Select, DatePicker, Row, Col, Modal, Upload, App, Tabs, TabsProps, message as antMessage, Form, InputNumber } from 'antd'
import { PlusOutlined, DownloadOutlined, UploadOutlined, DownOutlined, UpOutlined, FileTextOutlined, CalculatorOutlined, TableOutlined, DatabaseOutlined, SaveOutlined, GoogleOutlined, LinkOutlined } from '@ant-design/icons'
import { EstimatePosition, JUSTIFICATION_TYPES, UNITS, RateGroup } from '@/shared/types/estimate'
import EstimateTable from '@/widgets/estimate/EstimateTable'
import RateConsole from '@/widgets/estimate/RateConsole'
import { useQuery } from '@tanstack/react-query'
import { ratesApi } from '@/entities/rates'
import { projectsApi } from '@/entities/projects'
import { supabase } from '@/lib/supabase'

const { Option } = Select

export default function TenderTest() {
  const { message } = App.useApp()
  const [activeTab, setActiveTab] = useState<string>('console')
  const [filtersExpanded, setFiltersExpanded] = useState(false)
  const [selectedPositions, setSelectedPositions] = useState<string[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedProject, setSelectedProject] = useState<string>()
  const [selectedJustification, setSelectedJustification] = useState<string>()
  const [rateGroups, setRateGroups] = useState<RateGroup[]>([])
  const [isSaving, setIsSaving] = useState(false)
  const [googleSheetsModalVisible, setGoogleSheetsModalVisible] = useState(false)
  const [googleSheetsUrl, setGoogleSheetsUrl] = useState('')
  const [isAnalyzingSheet, setIsAnalyzingSheet] = useState(false)
  const [modifiedPositions, setModifiedPositions] = useState<Set<string>>(new Set())
  const [isSavingChanges, setIsSavingChanges] = useState(false)
  const [currentDraftId, setCurrentDraftId] = useState<string | null>(null)
  const [draftName, setDraftName] = useState<string>('')

  // Загружаем проекты
  const { data: projects = [], isLoading: projectsLoading } = useQuery({
    queryKey: ['projects'],
    queryFn: projectsApi.getAll,
  })

  // Загружаем существующие черновики для выбранного проекта
  const { data: drafts = [], isLoading: draftsLoading, refetch: refetchDrafts } = useQuery({
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
    enabled: !!selectedProject
  })

  // Загружаем расценки из сборника
  const { data: rates = [], isLoading: ratesLoading, refetch: refetchRates } = useQuery({
    queryKey: ['rates'],
    queryFn: ratesApi.getAll,
    refetchInterval: 5000, // Автообновление каждые 5 секунд
  })

  // Загружаем материалы расценок
  const { data: allRateMaterials = {}, isLoading: rateMaterialsLoading, refetch: refetchRateMaterials } = useQuery({
    queryKey: ['rateMaterials', 'all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('rate_materials_mapping')
        .select(`
          *,
          material:materials!material_id(*)
        `)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error loading rate materials:', error)
        return {}
      }

      // Группируем материалы по rate_id
      const grouped = data.reduce((acc: any, item: any) => {
        if (!acc[item.rate_id]) {
          acc[item.rate_id] = []
        }
        acc[item.rate_id].push(item)
        return acc
      }, {})

      return grouped
    },
    enabled: true,
    refetchInterval: 5000, // Автообновление каждые 5 секунд
  })

  // Функция автоматического импорта новой расценки
  const handleAutoImportNewRate = useCallback(async (newRate: any) => {
    console.log('Auto-importing new rate:', newRate)

    // Загружаем материалы для этой расценки
    const { data: materials, error } = await supabase
      .from('rate_materials_mapping')
      .select(`
        *,
        material:materials!material_id(*)
      `)
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
        children: []
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
        created_at: new Date().toISOString()
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
            materialType: 'основа',
            workName: material.material?.name || 'Материал',
            unit: material.material?.unit_short_name || 'ед',
            volume: volume,
            materialNorm: material.consumption || 1,
            workPrice: 0,
            materialPrice: price,
            deliveryPrice: 0,
            total: materialTotal,
            level: 1,
            created_at: new Date().toISOString()
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

    message.success(`Расценка "${newRate.name}" автоматически добавлена в табличный режим`)
  }, [message])

  // Автосохранение через 5 секунд после изменения
  useEffect(() => {
    if (modifiedPositions.size > 0 && selectedProject) {
      const timer = setTimeout(() => {
        console.log('Автосохранение через 5 секунд...')
        handleSaveChanges()
      }, 5000)

      return () => clearTimeout(timer)
    }
  }, [modifiedPositions.size, selectedProject])

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
          table: 'rates'
        },
        (payload) => {
          console.log('Rate change detected:', payload)

          // Обновляем данные при любых изменениях
          refetchRates()
          refetchRateMaterials()

          // Показываем уведомление о новой расценке
          if (payload.eventType === 'INSERT') {
            message.info('Добавлена новая расценка в сборник')

            // Если активна вкладка "Табличный режим", автоматически импортируем новую расценку
            if (activeTab === 'table' && payload.new) {
              console.log('Auto-importing new rate to table mode')
              // Небольшая задержка чтобы данные успели обновиться
              setTimeout(() => {
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
          table: 'rate_materials_mapping'
        },
        (payload) => {
          console.log('Rate materials change detected:', payload)
          refetchRateMaterials()
        }
      )
      .subscribe()

    return () => {
      console.log('Cleaning up realtime subscriptions')
      supabase.removeChannel(channel)
      supabase.removeChannel(materialsChannel)
    }
  }, [activeTab, handleAutoImportNewRate, message, refetchRates, refetchRateMaterials]) // Зависимости для корректной работы

  // Моковые данные для демонстрации иерархической структуры сметы
  const [positions, setPositions] = useState<EstimatePosition[]>([
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
          created_at: '2024-01-15T10:00:00Z'
        },
        {
          id: '1.2',
          number: '1.2',
          parentId: '1',
          justification: 'мат',
          materialType: 'основа',
          workName: 'Бетон B25',
          unit: 'м³',
          volume: 100,
          materialNorm: 1.05,
          workPrice: 5500,
          materialPrice: 5500,
          deliveryPrice: 275,
          total: 550000,
          level: 1,
          created_at: '2024-01-15T10:00:00Z'
        }
      ]
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
          created_at: '2024-01-16T14:30:00Z'
        },
        {
          id: '2.2',
          number: '2.2',
          parentId: '2',
          justification: 'мат',
          materialType: 'основа',
          workName: 'Арматура А500С d12',
          unit: 'кг',
          volume: 2500,
          materialNorm: 1.02,
          workPrice: 40,
          materialPrice: 65,
          deliveryPrice: 3.25,
          total: 100000,
          level: 1,
          created_at: '2024-01-16T14:30:00Z'
        }
      ]
    }
  ])

  // Функции для управления позициями сметы
  const handlePositionUpdate = (id: string, updates: Partial<EstimatePosition>) => {
    const updatePositionRecursive = (positions: EstimatePosition[]): EstimatePosition[] => {
      return positions.map(position => {
        if (position.id === id) {
          // Помечаем позицию как измененную
          return { ...position, ...updates, isEdited: true }
        }
        if (position.children) {
          return {
            ...position,
            children: updatePositionRecursive(position.children)
          }
        }
        return position
      })
    }

    setPositions(updatePositionRecursive(positions))

    // Отмечаем позицию как измененную для отслеживания
    setModifiedPositions(prev => {
      const newSet = new Set(prev)
      newSet.add(id)
      console.log('Modified positions:', Array.from(newSet))
      return newSet
    })

    // Не показываем сообщение при каждом изменении - слишком навязчиво
    console.log('Position updated:', {
      positionId: id,
      updates,
      modifiedCount: modifiedPositions.size + 1,
      timestamp: new Date().toISOString()
    })
  }

  const handlePositionAdd = (parentId?: string) => {
    const newPosition: EstimatePosition = {
      id: `new-${Date.now()}`,
      number: parentId ? `${parentId}.${Date.now()}` : `${positions.length + 1}`,
      parentId,
      justification: 'раб',
      workName: 'Новая позиция',
      unit: 'шт',
      volume: 1,
      workPrice: 0,
      total: 0,
      level: parentId ? 1 : 0,
      created_at: new Date().toISOString(),
      isEdited: true // Помечаем как новую/измененную
    }

    if (parentId) {
      // Добавляем как дочерний элемент
      const addToParent = (positions: EstimatePosition[]): EstimatePosition[] => {
        return positions.map(position => {
          if (position.id === parentId) {
            const children = position.children || []
            return {
              ...position,
              children: [...children, newPosition],
              expanded: true
            }
          }
          if (position.children) {
            return {
              ...position,
              children: addToParent(position.children)
            }
          }
          return position
        })
      }
      setPositions(addToParent(positions))
    } else {
      // Добавляем как корневой элемент
      setPositions([...positions, newPosition])
    }

    // Отмечаем новую позицию как измененную
    setModifiedPositions(prev => {
      const newSet = new Set(prev)
      newSet.add(newPosition.id)
      return newSet
    })

    message.success('Позиция добавлена')
    console.log('Position added:', { parentId, newPosition })
  }

  const handlePositionDelete = (id: string) => {
    console.log('🗑️ STARTING handlePositionDelete with id:', id)

    // Используем callback форму setState для получения актуального состояния
    setPositions(currentPositions => {
      console.log('📋 Current positions in callback:', currentPositions.length)

      const removeById = (items: EstimatePosition[]): EstimatePosition[] => {
        return items.filter(item => {
          if (item.id === id) {
            console.log('❌ REMOVING:', item.workName)
            return false
          }
          return true
        }).map(item => ({
          ...item,
          children: item.children ? removeById(item.children) : undefined
        }))
      }

      const result = removeById(currentPositions)
      console.log('✅ NEW STATE:', result.length, 'positions')
      return result
    })

    // Обновляем выбранные позиции
    setSelectedPositions(current => {
      const filtered = current.filter(selectedId => selectedId !== id)
      console.log('🔄 Selected positions updated, removed:', id)
      return filtered
    })

    message.success('Позиция удалена')
    console.log('🎉 COMPLETED handlePositionDelete')
  }


  // Функция анализа и импорта из Google Sheets
  const handleGoogleSheetsImport = async () => {
    if (!googleSheetsUrl) {
      message.warning('Введите ссылку на Google Sheets')
      return
    }

    setIsAnalyzingSheet(true)
    console.log('Анализ Google Sheets:', googleSheetsUrl)

    try {
      // Извлекаем ID документа из URL
      const sheetsIdMatch = googleSheetsUrl.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/)
      if (!sheetsIdMatch) {
        throw new Error('Неверный формат ссылки Google Sheets')
      }

      const spreadsheetId = sheetsIdMatch[1]
      console.log('Spreadsheet ID:', spreadsheetId)

      // Формируем URL для экспорта в CSV
      const exportUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv`

      message.info('Анализируем структуру документа...')

      // Здесь будет логика анализа через API или парсинг CSV
      // Для примера создадим тестовые данные
      const importedData = {
        project: {
          name: 'Импортированная смета из Google Sheets',
          customer: 'Заказчик из документа',
          contractor: 'Подрядчик',
          date: new Date().toISOString(),
          total_amount: 1500000
        },
        sections: [
          {
            section_name: 'Раздел 1: Подготовительные работы',
            items: [
              {
                name: 'Демонтаж старых конструкций',
                unit: 'м²',
                quantity: 150,
                unit_price: 1200,
                total_price: 180000
              },
              {
                name: 'Вывоз мусора',
                unit: 'т',
                quantity: 25,
                unit_price: 3500,
                total_price: 87500
              }
            ],
            section_total: 267500
          },
          {
            section_name: 'Раздел 2: Основные работы',
            items: [
              {
                name: 'Устройство фундамента',
                unit: 'м³',
                quantity: 85,
                unit_price: 12000,
                total_price: 1020000
              },
              {
                name: 'Монтаж арматуры',
                unit: 'т',
                quantity: 18,
                unit_price: 45000,
                total_price: 810000
              }
            ],
            section_total: 1830000
          }
        ],
        summary: {
          subtotal: 2097500,
          overhead: 209750,
          profit: 104875,
          vat: 362422.5,
          total: 2774547.5
        }
      }

      // Преобразуем импортированные данные в позиции сметы
      const newPositions: EstimatePosition[] = []
      let positionNumber = positions.length + 1

      importedData.sections.forEach((section, sectionIndex) => {
        // Создаем группу для раздела
        const sectionPosition: EstimatePosition = {
          id: `import-section-${sectionIndex}`,
          number: `${positionNumber}`,
          justification: 'подрядчик',
          workName: section.section_name,
          unit: 'компл',
          volume: 1,
          workPrice: 0,
          total: section.section_total,
          level: 0,
          expanded: true,
          created_at: new Date().toISOString(),
          children: []
        }

        // Добавляем позиции раздела
        section.items.forEach((item, itemIndex) => {
          const itemPosition: EstimatePosition = {
            id: `import-item-${sectionIndex}-${itemIndex}`,
            number: `${positionNumber}.${itemIndex + 1}`,
            parentId: sectionPosition.id,
            justification: item.name.includes('материал') ? 'мат' : 'раб',
            workName: item.name,
            unit: item.unit,
            volume: item.quantity,
            workPrice: item.unit_price,
            total: item.total_price,
            level: 1,
            created_at: new Date().toISOString()
          }
          sectionPosition.children?.push(itemPosition)
        })

        newPositions.push(sectionPosition)
        positionNumber++
      })

      // Добавляем импортированные позиции и отмечаем как измененные
      setPositions(prev => [...prev, ...newPositions])

      // Отмечаем все импортированные позиции как измененные
      setModifiedPositions(prev => {
        const newSet = new Set(prev)
        newPositions.forEach(pos => {
          newSet.add(pos.id)
          pos.children?.forEach(child => newSet.add(child.id))
        })
        return newSet
      })

      setGoogleSheetsModalVisible(false)
      setGoogleSheetsUrl('')

      message.success(`Успешно импортировано ${importedData.sections.length} разделов из Google Sheets`)
      console.log('Импортированные данные:', importedData)

    } catch (error) {
      console.error('Ошибка импорта из Google Sheets:', error)
      message.error(`Ошибка импорта: ${error}`)
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
          lastModified: new Date().toISOString()
        }
      }

      // Вычисляем общую сумму
      const calculateTotal = (items: EstimatePosition[]): number => {
        return items.reduce((sum, item) => {
          const itemTotal = item.total || 0
          const childrenTotal = item.children ? calculateTotal(item.children) : 0
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
            updated_at: new Date().toISOString()
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
            name: draftName || `Черновик сметы от ${new Date().toLocaleDateString()}`,
            data: draftData,
            total_amount: totalAmount,
            status: 'draft'
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
      // Создаем запись сметы
      const { data: estimate, error: estimateError } = await supabase
        .from('tender_estimates')
        .insert({
          project_id: selectedProject,
          name: `Смета от ${new Date().toLocaleDateString()}`,
          status: 'draft',
          total_cost: positions.reduce((sum, pos) => sum + (pos.total || 0), 0),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single()

      if (estimateError) {
        throw estimateError
      }

      console.log('Estimate created:', estimate)

      // Сохраняем позиции сметы
      const flattenPositions = (items: EstimatePosition[], parentId?: string): any[] => {
        const result: any[] = []
        items.forEach(item => {
          result.push({
            estimate_id: estimate.id,
            parent_id: parentId || null,
            number: item.number,
            justification: item.justification,
            work_name: item.workName,
            unit: item.unit,
            volume: item.volume || 0,
            work_price: item.workPrice || 0,
            material_price: item.materialPrice || 0,
            delivery_price: item.deliveryPrice || 0,
            total: item.total || 0,
            material_type: item.materialType,
            material_norm: item.materialNorm,
            level: item.level || 0,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })

          if (item.children && item.children.length > 0) {
            result.push(...flattenPositions(item.children, item.id))
          }
        })
        return result
      }

      const positionsToSave = flattenPositions(positions)

      const { error: positionsError } = await supabase
        .from('tender_estimate_positions')
        .insert(positionsToSave)

      if (positionsError) {
        throw positionsError
      }

      message.success('Смета успешно сохранена')
      console.log('Estimate saved successfully:', estimate.id)
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
        children: []
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
        created_at: new Date().toISOString()
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
          materialType: 'основа',
          workName: material.material?.name || 'Материал',
          unit: material.material?.unit_short_name || 'ед',
          volume: volume,
          materialNorm: material.consumption || 1,
          workPrice: 0,
          materialPrice: price,
          deliveryPrice: 0,
          total: materialTotal,
          level: 1,
          created_at: new Date().toISOString()
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

  // Заглушки для функций импорта/экспорта
  const handleImportCSV = () => {
    message.info('Функция импорта CSV пока не реализована в новой версии')
    console.log('📥 Import CSV clicked')
  }

  const handleExportCSV = () => {
    message.info('Функция экспорта CSV пока не реализована в новой версии')
    console.log('📤 Export CSV clicked')
  }


  const findPositionById = (positions: EstimatePosition[], id: string): EstimatePosition | null => {
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

  const handleToggleExpanded = (id: string) => {
    const toggleExpanded = (positions: EstimatePosition[]): EstimatePosition[] => {
      return positions.map(position => {
        if (position.id === id) {
          return { ...position, expanded: !position.expanded }
        }
        if (position.children) {
          return {
            ...position,
            children: toggleExpanded(position.children)
          }
        }
        return position
      })
    }

    setPositions(toggleExpanded(positions))
    console.log('Position expanded toggled:', { positionId: id })
  }

  const fileInputRef = useRef<HTMLInputElement>(null)

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

    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const csvContent = e.target?.result as string
        console.log('📋 CSV content loaded, length:', csvContent.length)

        const importedPositions = parseCSVToPositions(csvContent)
        console.log('✅ Parsed positions:', importedPositions.length)

        if (importedPositions.length > 0) {
          setPositions(importedPositions)
          setSelectedPositions([])
          message.success(`Импортировано ${importedPositions.length} позиций из ${file.name}`)
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
          materialType: columns[2] ? (columns[2] as 'основа' | 'вспом') : undefined,
          workName: columns[3] || `Позиция ${i}`,
          unit: columns[4] || 'шт',
          volume: parseFloat(columns[5]) || 1,
          materialNorm: columns[6] ? parseFloat(columns[6]) : undefined,
          workPrice: parseFloat(columns[7]) || 0,
          materialPrice: columns[8] ? parseFloat(columns[8]) : undefined,
          deliveryPrice: columns[9] ? parseFloat(columns[9]) : undefined,
          total: parseFloat(columns[10]) || 0,
          level: 0,
          created_at: new Date().toISOString()
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

  const getValidJustification = (value: string): 'подрядчик' | 'раб' | 'мат' => {
    const normalized = value?.toLowerCase().trim()
    if (normalized?.includes('подрядчик') || normalized?.includes('заказчик')) return 'подрядчик'
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
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const link = document.createElement('a')
      const url = URL.createObjectURL(blob)

      link.setAttribute('href', url)
      link.setAttribute('download', `smeta_${new Date().toISOString().split('T')[0]}.csv`)
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
      'Итого'
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
        position.total.toString()
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
"1","подрядчик","","Земляные работы","компл",1,,0,,,100000
"1.1","раб","","Разработка грунта экскаватором","м³",500,,200,,,100000
"2","подрядчик","","Бетонные работы","компл",1,,0,,,450000
"2.1","раб","","Устройство фундамента","м³",100,,3500,,,350000
"2.2","мат","основа","Бетон B25","м³",100,1.05,0,5500,275,550000
"3","подрядчик","","Арматурные работы","компл",1,,0,,,162500
"3.1","раб","","Вязка арматуры","кг",2500,,25,,,62500
"3.2","мат","основа","Арматура А500С d12","кг",2500,1.02,0,65,3.25,100000`

    const blob = new Blob([sampleCSV], { type: 'text/csv;charset=utf-8;' })
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
            created_at: '2024-01-15T10:00:00Z'
          },
          {
            id: '1.2',
            number: '1.2',
            parentId: '1',
            justification: 'мат',
            materialType: 'основа',
            workName: 'Бетон B25',
            unit: 'м³',
            volume: 100,
            materialNorm: 1.05,
            workPrice: 5500,
            materialPrice: 5500,
            deliveryPrice: 275,
            total: 550000,
            level: 1,
            created_at: '2024-01-15T10:00:00Z'
          }
        ]
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
            created_at: '2024-01-16T14:30:00Z'
          },
          {
            id: '2.2',
            number: '2.2',
            parentId: '2',
            justification: 'мат',
            materialType: 'основа',
            workName: 'Арматура А500С d12',
            unit: 'кг',
            volume: 2500,
            materialNorm: 1.02,
            workPrice: 40,
            materialPrice: 65,
            deliveryPrice: 3.25,
            total: 100000,
            level: 1,
            created_at: '2024-01-16T14:30:00Z'
          }
        ]
      }
    ]

    setPositions(testData)
    setSelectedPositions([])
    message.success('Тестовые данные восстановлены')
    console.log('🔄 Test data restored')
  }

  // Сбрасываем некорректные выборы при рендере
  const validSelectedPositions = selectedPositions.filter(id =>
    findPositionById(positions, id) !== null
  )

  if (validSelectedPositions.length !== selectedPositions.length) {
    console.log('🧹 Cleaning up invalid selections')
    setSelectedPositions(validSelectedPositions)
  }

  console.log('📊 TenderTest page rendered:', {
    positionsCount: positions.length,
    selectedCount: selectedPositions.length,
    validSelectedCount: validSelectedPositions.length,
    filtersExpanded,
    timestamp: new Date().toISOString()
  })

  // Конфигурация вкладок
  const tabItems: TabsProps['items'] = [
    {
      key: 'console',
      label: (
        <span>
          <CalculatorOutlined />
          Консоль расценок
        </span>
      ),
      children: <RateConsole onAddNew={() => message.info('Добавление новой позиции')} />
    },
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
            <Card size="small" style={{ marginBottom: 16 }}>
              <Row gutter={16} align="middle">
                <Col span={6}>
                  <Select
                    placeholder="Выберите проект"
                    style={{ width: '100%' }}
                    allowClear
                    showSearch
                    value={selectedProject}
                    onChange={(value) => {
                      setSelectedProject(value)
                      setCurrentDraftId(null) // Сбрасываем черновик при смене проекта
                      setDraftName('')
                    }}
                    loading={projectsLoading}
                    filterOption={(input, option) => {
                      const text = (option?.children || option?.label)?.toString() || ""
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
                    onChange={(e) => setSearchTerm(e.target.value)}
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
                      onChange={async (draftId) => {
                        if (!draftId) {
                          setCurrentDraftId(null)
                          setDraftName('')
                          return
                        }

                        const draft = drafts.find(d => d.id === draftId)
                        if (draft && draft.data) {
                          const loadedPositions = draft.data.positions || []
                          // Очищаем флаги isEdited при загрузке
                          const cleanPositions = (items: EstimatePosition[]): EstimatePosition[] => {
                            return items.map(item => ({
                              ...item,
                              isEdited: false,
                              children: item.children ? cleanPositions(item.children) : undefined
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
                        const text = (option?.children || option?.label)?.toString() || ""
                        return text.toLowerCase().includes(input.toLowerCase())
                      }}
                    >
                      {drafts.map(draft => (
                        <Option key={draft.id} value={draft.id}>
                          {draft.name} ({new Date(draft.updated_at).toLocaleDateString()})
                        </Option>
                      ))}
                    </Select>
                  )}
                </Col>
                <Col span={8}>
                  <Space>
                    <Button type="primary" icon={<PlusOutlined />} onClick={() => handlePositionAdd()}>
                      Добавить
                    </Button>
                    <Button
                      icon={<DatabaseOutlined />}
                      onClick={handleImportFromRates}
                      loading={ratesLoading || rateMaterialsLoading}
                      style={{ backgroundColor: '#52c41a', color: 'white', borderColor: '#52c41a' }}
                    >
                      Из сборника
                    </Button>
                    <Button
                      icon={<GoogleOutlined />}
                      onClick={() => setGoogleSheetsModalVisible(true)}
                      style={{ backgroundColor: '#4285f4', color: 'white', borderColor: '#4285f4' }}
                    >
                      Google Sheets
                    </Button>
                    <Button icon={<UploadOutlined />} onClick={handleImportCSV}>
                      Импорт CSV
                    </Button>
                    <Button icon={<DownloadOutlined />} onClick={handleExportCSV}>
                      Экспорт
                    </Button>
                    <Button
                      type="primary"
                      icon={<SaveOutlined />}
                      onClick={handleSaveEstimate}
                      loading={isSaving}
                      disabled={!selectedProject || positions.length === 0}
                    >
                      Сохранить
                    </Button>
                    <Button
                      type={modifiedPositions.size > 0 ? "primary" : "default"}
                      icon={<SaveOutlined />}
                      onClick={handleSaveChanges}
                      loading={isSavingChanges}
                      disabled={!selectedProject || positions.length === 0}
                      danger={modifiedPositions.size > 0}
                      style={modifiedPositions.size > 0 ? {
                        backgroundColor: '#ff4d4f',
                        borderColor: '#ff4d4f',
                        color: 'white'
                      } : {}}
                    >
                      {currentDraftId ?
                        `Обновить черновик${modifiedPositions.size > 0 ? ` (${modifiedPositions.size})` : ''}` :
                        `Сохранить как черновик${modifiedPositions.size > 0 ? ` (${modifiedPositions.size})` : ''}`
                      }
                    </Button>
                  </Space>
                </Col>
              </Row>
            </Card>
          </div>

          <div style={{ flex: 1, overflow: 'hidden', minHeight: 0 }}>
            <EstimateTable
              positions={positions}
              onPositionUpdate={handlePositionUpdate}
              onPositionAdd={handlePositionAdd}
              onPositionDelete={handlePositionDelete}
              onToggleExpanded={handleToggleExpanded}
              selectedPositions={selectedPositions}
              onSelectionChange={setSelectedPositions}
              searchTerm={searchTerm}
            />
          </div>
        </div>
      )
    }
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
          <Button key="cancel" onClick={() => {
            setGoogleSheetsModalVisible(false)
            setGoogleSheetsUrl('')
          }}>
            Отмена
          </Button>,
          <Button
            key="import"
            type="primary"
            icon={<DownloadOutlined />}
            loading={isAnalyzingSheet}
            onClick={handleGoogleSheetsImport}
          >
            Анализировать и импортировать
          </Button>
        ]}
      >
        <Space direction="vertical" style={{ width: '100%' }} size="large">
          <div>
            <h4>Инструкция по импорту:</h4>
            <ol>
              <li>Откройте Google Sheets документ со сметой</li>
              <li>Скопируйте полную ссылку из адресной строки браузера</li>
              <li>Вставьте ссылку в поле ниже</li>
              <li>Нажмите "Анализировать и импортировать"</li>
            </ol>
          </div>

          <Input
            size="large"
            placeholder="https://docs.google.com/spreadsheets/d/..."
            prefix={<LinkOutlined />}
            value={googleSheetsUrl}
            onChange={(e) => setGoogleSheetsUrl(e.target.value)}
          />

          <Card size="small" style={{ backgroundColor: '#f5f5f5' }}>
            <h4>Что будет импортировано:</h4>
            <ul style={{ marginBottom: 0 }}>
              <li>Общие данные проекта (название, заказчик, исполнитель)</li>
              <li>Разделы работ с детализацией</li>
              <li>Позиции сметы (наименование, единицы, количество, цены)</li>
              <li>Накладные расходы и прибыль</li>
              <li>НДС и итоговые суммы</li>
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
