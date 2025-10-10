import React, { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  Button,
  Table,
  Space,
  InputNumber,
  Select,
  message,
  Typography,
  Modal,
  Card,
  Row,
  Col,
  Alert,
  Input,
  Tabs,
  Statistic,
  Progress,
} from 'antd'
import {
  PlusOutlined,
  DeleteOutlined,
  DownloadOutlined,
  SearchOutlined,
  FileExcelOutlined,
  ProjectOutlined,
  SaveOutlined,
  DownOutlined,
  UpOutlined,
  PlusCircleOutlined,
  CalculatorOutlined,
  BarChartOutlined,
  DollarOutlined,
  TeamOutlined,
  PieChartOutlined,
  FileTextOutlined,
} from '@ant-design/icons'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/features/auth/model/store'
import {
  CoefficientsPanel,
  RateAutocomplete,
  MaterialAutocomplete,
} from '@/widgets/estimate'
import { ratesApi } from '@/entities/rates/api/rates-api'
import { rateMaterialsApi } from '@/entities/rates/api/rate-materials-api'
import { materialsApi } from '@/entities/materials/api/materials-api'
import { unitsApi } from '@/entities/units/api/units-api'
import { projectsApi } from '@/entities/projects'
import type { RateWithUnit } from '@/entities/rates'
import type { MaterialWithUnit } from '@/entities/materials'
import {
  loadCoefficients,
  type EstimateCoefficients,
} from '@/shared/lib/estimateCoefficients'
import {
  calculateRow,
  calculateTotals,
  calculateCustomerTotals,
  formatCurrencyWithSymbol,
  type EstimateRow,
  type RowType,
  type MaterialType,
} from '@/shared/lib/estimateCalculations'
import type { ColumnsType } from 'antd/es/table'

const { Title, Text } = Typography

const EstimateCalculatorDemo = () => {
  const queryClient = useQueryClient()
  const { user } = useAuthStore()
  const [searchParams] = useSearchParams()
  const estimateId = searchParams.get('estimateId') // ID сметы из URL

  const [coefficients, setCoefficients] =
    useState<EstimateCoefficients>(loadCoefficients())
  const [rateModalVisible, setRateModalVisible] = useState(false)
  const [materialModalVisible, setMaterialModalVisible] = useState(false)
  const [selectedRowId, setSelectedRowId] = useState<string | null>(null)
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(
    null
  )
  const [saveModalVisible, setSaveModalVisible] = useState(false)
  const [estimateName, setEstimateName] = useState('')
  const [currentEstimateId, setCurrentEstimateId] = useState<string | null>(
    null
  )

  // Загрузка расценок и материалов
  const { data: rates = [], isLoading: ratesLoading } = useQuery({
    queryKey: ['rates'],
    queryFn: ratesApi.getAll,
  })

  const { data: materials = [], isLoading: materialsLoading } = useQuery({
    queryKey: ['materials'],
    queryFn: materialsApi.getAll,
  })

  // Загрузка единиц измерения
  const { data: units = [], isLoading: unitsLoading } = useQuery({
    queryKey: ['units'],
    queryFn: unitsApi.getAll,
  })

  // Загрузка проектов
  const { data: projects = [], isLoading: projectsLoading } = useQuery({
    queryKey: ['projects'],
    queryFn: projectsApi.getAll,
  })

  const [rows, setRows] = useState<EstimateRow[]>([])
  const [activeTab, setActiveTab] = useState<string>('calculator')

  const addRow = () => {
    // Ищем последнюю строку "Заказчик" для получения объема
    let customerVolume = 0
    for (let i = rows.length - 1; i >= 0; i--) {
      if (rows[i].rowType === 'Заказчик') {
        customerVolume = rows[i].volume || 0
        console.log('Найдена последняя строка Заказчик для новой строки', {
          customerRow: rows[i].workName,
          volume: customerVolume,
        })
        break
      }
    }

    const newRow: EstimateRow = {
      id: Date.now().toString(),
      materialType: '',
      rowType: 'раб',
      workName: '',
      unit: 'м3',
      volume: customerVolume, // Подтягиваем объем от ближайшей строки "Заказчик"
      materialCoef: 1,
      workVolume: customerVolume, // Устанавливаем workVolume = volume
      workPrice: 0,
      matPriceNoDelivery: 0,
      delivery: 0,
      matPriceWithDelivery: 0,
    }

    console.log('Добавление новой строки с объемом', {
      rowType: newRow.rowType,
      volume: newRow.volume,
      customerVolume,
    })

    setRows([...rows, newRow])
  }

  const deleteRow = (id: string) => {
    setRows(rows.filter(row => row.id !== id))
  }

  // Вставка новой строки после указанной строки
  const insertRowAfter = (afterId: string) => {
    const afterIndex = rows.findIndex(row => row.id === afterId)
    if (afterIndex === -1) return

    console.log('Вставка новой строки после', {
      afterId,
      afterIndex,
      afterRowName: rows[afterIndex].workName,
      timestamp: new Date().toISOString(),
    })

    // Ищем ближайшую строку "Заказчик" выше для получения объема
    let customerVolume = 0
    for (let i = afterIndex; i >= 0; i--) {
      if (rows[i].rowType === 'Заказчик') {
        customerVolume = rows[i].volume || 0
        console.log('Найдена строка Заказчик для новой вставляемой строки', {
          customerRow: rows[i].workName,
          volume: customerVolume,
        })
        break
      }
    }

    const newRow: EstimateRow = {
      id: Date.now().toString(),
      materialType: '',
      rowType: 'раб',
      workName: '',
      unit: 'м3',
      volume: customerVolume,
      materialCoef: 1,
      workVolume: customerVolume,
      workPrice: 0,
      matPriceNoDelivery: 0,
      delivery: 0,
      matPriceWithDelivery: 0,
    }

    console.log('Новая строка создана', {
      rowType: newRow.rowType,
      volume: newRow.volume,
      position: afterIndex + 1,
    })

    // Вставляем новую строку после указанной позиции
    const newRows = [...rows]
    newRows.splice(afterIndex + 1, 0, newRow)
    setRows(newRows)
  }

  const toggleCollapse = (id: string) => {
    setRows(
      rows.map(row =>
        row.id === id ? { ...row, isCollapsed: !row.isCollapsed } : row
      )
    )
    console.log('Переключение сворачивания группы', {
      rowId: id,
      timestamp: new Date().toISOString(),
    })
  }

  const updateRow = (id: string, field: keyof EstimateRow, value: unknown) => {
    setRows(prevRows => {
      let updatedRows = prevRows.map(row => {
        if (row.id === id) {
          const updated = { ...row, [field]: value }

          // Автоматический расчёт workVolume
          if (field === 'volume' && row.rowType !== 'Заказчик') {
            updated.workVolume = value as number
          }

          // Автоматический расчёт цены материала с доставкой
          if (field === 'matPriceNoDelivery' || field === 'delivery') {
            const price =
              parseFloat(
                String(
                  field === 'matPriceNoDelivery'
                    ? value
                    : row.matPriceNoDelivery
                )
              ) || 0
            const delivery =
              parseFloat(String(field === 'delivery' ? value : row.delivery)) ||
              0
            updated.matPriceWithDelivery = price + delivery
          }

          return updated
        }
        return row
      })

      // Автоматическое сворачивание предыдущей группы при добавлении новой строки "Заказчик"
      if (field === 'rowType' && value === 'Заказчик') {
        const currentIndex = updatedRows.findIndex(r => r.id === id)

        // Ищем предыдущую строку "Заказчик" и сворачиваем её
        for (let i = currentIndex - 1; i >= 0; i--) {
          if (updatedRows[i].rowType === 'Заказчик') {
            updatedRows[i] = { ...updatedRows[i], isCollapsed: true }
            console.log(
              'Автоматическое сворачивание предыдущей группы Заказчик',
              {
                previousCustomerId: updatedRows[i].id,
                previousCustomerName: updatedRows[i].workName,
                timestamp: new Date().toISOString(),
              }
            )
            break
          }
        }
      }

      // Автоматический пересчет объема материала при изменении коэффициента расхода
      if (field === 'materialCoef') {
        const changedRow = updatedRows.find(r => r.id === id)

        if (
          changedRow &&
          (changedRow.rowType === 'мат' || changedRow.rowType === 'суб-мат')
        ) {
          const matIndex = updatedRows.findIndex(r => r.id === id)

          // Ищем ближайшую строку "раб" или "суб-раб" выше
          let workRow = null
          for (let i = matIndex - 1; i >= 0; i--) {
            if (
              updatedRows[i].rowType === 'раб' ||
              updatedRows[i].rowType === 'суб-раб'
            ) {
              workRow = updatedRows[i]
              break
            }
            // Прекращаем поиск при встрече "Заказчик"
            if (updatedRows[i].rowType === 'Заказчик') {
              break
            }
          }

          if (workRow) {
            const newVolume =
              (workRow.volume || 0) * (changedRow.materialCoef || 1)

            console.log('Пересчет объема материала по коэффициенту расхода', {
              materialId: changedRow.id,
              materialName: changedRow.workName,
              workRowName: workRow.workName,
              workVolume: workRow.volume,
              materialCoef: changedRow.materialCoef,
              oldVolume: changedRow.volume,
              newVolume,
              calculation: `${workRow.volume} × ${changedRow.materialCoef}`,
              timestamp: new Date().toISOString(),
            })

            updatedRows[matIndex] = {
              ...changedRow,
              volume: newVolume,
              workVolume: newVolume,
            }
          }
        }
      }

      // Каскадное распространение объема от строки "Заказчик" вниз
      if (field === 'volume') {
        const changedRow = updatedRows.find(r => r.id === id)

        if (changedRow && changedRow.rowType === 'Заказчик') {
          console.log('Каскадное распространение объема от строки Заказчик', {
            rowId: id,
            workName: changedRow.workName,
            newVolume: changedRow.volume,
            timestamp: new Date().toISOString(),
          })

          const customerIndex = updatedRows.findIndex(r => r.id === id)

          // Распространяем объем на все строки ниже до следующей строки "Заказчик"
          for (let i = customerIndex + 1; i < updatedRows.length; i++) {
            const nextRow = updatedRows[i]

            // Прекращаем при встрече новой строки "Заказчик"
            if (nextRow.rowType === 'Заказчик') {
              break
            }

            // Обновляем объем для всех типов строк кроме материалов
            if (nextRow.rowType === 'раб' || nextRow.rowType === 'суб-раб') {
              console.log('Обновляем объем строки раб/суб-раб', {
                rowId: nextRow.id,
                rowName: nextRow.workName,
                oldVolume: nextRow.volume,
                newVolume: changedRow.volume,
              })

              updatedRows[i] = {
                ...nextRow,
                volume: changedRow.volume,
                workVolume: changedRow.volume,
              }
            } else if (
              nextRow.rowType === 'мат' ||
              nextRow.rowType === 'суб-мат'
            ) {
              // Для материалов пересчитываем с учетом коэффициента расхода
              // Ищем ближайшую строку "раб" выше для получения объема
              let workVolume = changedRow.volume
              for (let j = i - 1; j > customerIndex; j--) {
                if (
                  updatedRows[j].rowType === 'раб' ||
                  updatedRows[j].rowType === 'суб-раб'
                ) {
                  workVolume = updatedRows[j].volume || changedRow.volume
                  break
                }
              }

              const newMatVolume =
                (workVolume || 0) * (nextRow.materialCoef || 1)

              console.log('Обновляем объем материала с учетом коэффициента', {
                materialId: nextRow.id,
                materialName: nextRow.workName,
                workVolume,
                materialCoef: nextRow.materialCoef,
                oldVolume: nextRow.volume,
                newVolume: newMatVolume,
                calculation: `${workVolume} × ${nextRow.materialCoef}`,
              })

              updatedRows[i] = {
                ...nextRow,
                volume: newMatVolume,
                workVolume: newMatVolume,
              }
            }
          }
        }
        // Пересчет объемов материалов при изменении объема в строке "раб"
        else if (
          changedRow &&
          (changedRow.rowType === 'раб' || changedRow.rowType === 'суб-раб')
        ) {
          console.log(
            'Пересчет объемов материалов при изменении объема работ',
            {
              rowId: id,
              workName: changedRow.workName,
              newVolume: changedRow.volume,
              timestamp: new Date().toISOString(),
            }
          )

          const workIndex = updatedRows.findIndex(r => r.id === id)

          // Ищем строки материалов после этой строки работ до следующей строки "Заказчик" или "раб"
          for (let i = workIndex + 1; i < updatedRows.length; i++) {
            const nextRow = updatedRows[i]

            // Прекращаем поиск при встрече новой строки "Заказчик", "раб" или "суб-раб"
            if (
              nextRow.rowType === 'Заказчик' ||
              nextRow.rowType === 'раб' ||
              nextRow.rowType === 'суб-раб'
            ) {
              break
            }

            // Пересчитываем объем для материалов
            if (nextRow.rowType === 'мат' || nextRow.rowType === 'суб-мат') {
              const newVolume =
                (changedRow.volume || 0) * (nextRow.materialCoef || 1)

              console.log('Обновляем объем материала', {
                materialId: nextRow.id,
                materialName: nextRow.workName,
                oldVolume: nextRow.volume,
                newVolume,
                calculation: `${changedRow.volume} × ${nextRow.materialCoef}`,
              })

              updatedRows[i] = {
                ...nextRow,
                volume: newVolume,
                workVolume: newVolume,
              }
            }
          }
        }
      }

      // Автосохранение строки в сборник расценок или материалов
      const updatedRow = updatedRows.find(r => r.id === id)
      if (updatedRow) {
        // Запускаем автосохранение асинхронно, не блокируя UI
        setTimeout(() => autoSaveToCollection(updatedRow), 1000)
      }

      return updatedRows
    })
  }

  // Автоматическое сохранение строки в сборник расценок или материалов
  const autoSaveToCollection = async (row: EstimateRow | undefined) => {
    if (!row || !row.workName || row.workName.trim() === '') return

    // Проверяем, заполнены ли основные поля
    const hasValidData =
      row.workName.trim() !== '' &&
      row.unit &&
      ((row.rowType === 'раб' && row.workPrice > 0) ||
        (row.rowType === 'мат' && row.matPriceWithDelivery > 0))

    if (!hasValidData) return

    try {
      // Сохранение строки "раб" в сборник расценок
      if (row.rowType === 'раб' || row.rowType === 'суб-раб') {
        // Находим ID единицы измерения
        const unit = units.find(u => u.name === row.unit)
        if (!unit) {
          console.warn('⚠️ Единица измерения не найдена для автосохранения', {
            unitName: row.unit,
            rowName: row.workName,
          })
          return
        }

        // Проверяем, не существует ли уже такая расценка
        const existingRate = rates.find(
          r => r.name.toLowerCase() === row.workName.toLowerCase().trim()
        )

        if (existingRate) {
          console.log('ℹ️ Расценка уже существует в сборнике', {
            rateName: row.workName,
            existingRateId: existingRate.id,
          })
          return
        }

        const rateData: typeof import('@/entities/rates').RateCreate = {
          code: `AUTO-${Date.now()}`,
          name: row.workName.trim(),
          description: 'Автоматически создано из сметы',
          unit_id: unit.id,
          base_price: row.workPrice,
          category: 'общестроительные_работы',
          subcategory: 'разное',
          is_active: true,
        }

        await ratesApi.create(rateData)

        console.log(
          '✅ Строка "раб" автоматически сохранена в сборник расценок',
          {
            rowName: row.workName,
            workPrice: row.workPrice,
            unit: row.unit,
            timestamp: new Date().toISOString(),
          }
        )

        // Обновляем список расценок
        queryClient.invalidateQueries({ queryKey: ['rates'] })
      }
      // Сохранение строки "мат" в сборник материалов
      else if (row.rowType === 'мат' || row.rowType === 'суб-мат') {
        // Находим ID единицы измерения
        const unit = units.find(u => u.name === row.unit)
        if (!unit) {
          console.warn('⚠️ Единица измерения не найдена для автосохранения', {
            unitName: row.unit,
            rowName: row.workName,
          })
          return
        }

        // Проверяем, не существует ли уже такой материал
        const existingMaterial = materials.find(
          m => m.name.toLowerCase() === row.workName.toLowerCase().trim()
        )

        if (existingMaterial) {
          console.log('ℹ️ Материал уже существует в сборнике', {
            materialName: row.workName,
            existingMaterialId: existingMaterial.id,
          })
          return
        }

        const materialData: typeof import('@/entities/materials').MaterialCreate =
          {
            code: `AUTO-${Date.now()}`,
            name: row.workName.trim(),
            description: 'Автоматически создано из сметы',
            unit_id: unit.id,
            last_purchase_price: row.matPriceWithDelivery,
            category: 'общестроительные',
            is_active: true,
          }

        await materialsApi.create(materialData)

        console.log(
          '✅ Строка "мат" автоматически сохранена в сборник материалов',
          {
            rowName: row.workName,
            materialPrice: row.matPriceWithDelivery,
            unit: row.unit,
            timestamp: new Date().toISOString(),
          }
        )

        // Обновляем список материалов
        queryClient.invalidateQueries({ queryKey: ['materials'] })
      }
    } catch (error) {
      console.error('❌ Ошибка автосохранения в сборник', {
        rowType: row.rowType,
        rowName: row.workName,
        error,
      })
    }
  }

  const openRateModal = (rowId: string) => {
    console.log('Открытие модального окна выбора расценки', {
      rowId,
      timestamp: new Date().toISOString(),
    })
    setSelectedRowId(rowId)
    setRateModalVisible(true)
  }

  const openMaterialModal = (rowId: string) => {
    console.log('Открытие модального окна выбора материала', {
      rowId,
      timestamp: new Date().toISOString(),
    })
    setSelectedRowId(rowId)
    setMaterialModalVisible(true)
  }

  const handleRateSelect = async (rate: RateWithUnit) => {
    if (!selectedRowId) return

    console.log('Выбрана расценка для строки', {
      rowId: selectedRowId,
      rateId: rate.id,
      rateName: rate.name,
      ratePrice: rate.base_price,
      timestamp: new Date().toISOString(),
    })

    // Загружаем материалы для этой расценки
    try {
      const rateMaterials = await rateMaterialsApi.getByRateId(rate.id)
      console.log('Загружены материалы для расценки', {
        rateId: rate.id,
        materialsCount: rateMaterials.length,
        materials: rateMaterials,
      })

      // Если есть материалы, загружаем полную информацию о них
      const materialDetails = await Promise.all(
        rateMaterials.map(async rm => {
          const material = materials.find(m => m.id === rm.material_id)
          return {
            rateMaterial: rm,
            material: material,
          }
        })
      )

      console.log('Детали материалов загружены', { materialDetails })

      setRows(currentRows => {
        const rowIndex = currentRows.findIndex(r => r.id === selectedRowId)
        if (rowIndex === -1) return currentRows

        // Ищем ближайшую строку "Заказчик" выше для получения объема
        let customerVolume = 0
        for (let i = rowIndex - 1; i >= 0; i--) {
          if (currentRows[i].rowType === 'Заказчик') {
            customerVolume = currentRows[i].volume || 0
            console.log('Найдена строка Заказчик для новой расценки', {
              customerRow: currentRows[i].workName,
              volume: customerVolume,
            })
            break
          }
        }

        // Обновляем строку работы
        const updatedRows = currentRows.map(row => {
          if (row.id === selectedRowId) {
            return {
              ...row,
              workName: rate.name,
              unit: rate.unit_short_name,
              workPrice: rate.base_price,
              rowType: 'раб',
              volume: customerVolume,
              workVolume: customerVolume,
            }
          }
          return row
        })

        // Добавляем материалы, если они есть
        if (materialDetails.length > 0) {
          const newMaterialRows = materialDetails
            .filter(md => md.material) // Только если материал найден
            .map(md => {
              const materialCoef = md.rateMaterial.consumption || 1
              const materialVolume = customerVolume * materialCoef
              const materialPrice =
                md.material!.last_purchase_price ||
                md.rateMaterial.unit_price ||
                0

              console.log('Создание строки материала', {
                materialName: md.material!.name,
                materialCoef,
                customerVolume,
                materialVolume,
                materialPrice,
              })

              return {
                id: crypto.randomUUID(),
                materialType: 'основ' as const,
                rowType: 'мат' as const,
                workName: md.material!.name,
                unit: md.material!.unit_short_name,
                volume: materialVolume,
                materialCoef: materialCoef,
                workVolume: materialVolume,
                workPrice: 0,
                matPriceNoDelivery: materialPrice,
                delivery: 0,
                matPriceWithDelivery: materialPrice,
              }
            })

          // Вставляем материалы после строки работы
          const insertIndex = rowIndex + 1
          updatedRows.splice(insertIndex, 0, ...newMaterialRows)

          console.log('Добавлено материалов:', {
            count: newMaterialRows.length,
            afterRow: rate.name,
          })

          message.success(
            `Добавлена расценка: ${rate.name} и ${newMaterialRows.length} материал(ов)`
          )
        } else {
          message.success(`Добавлена расценка: ${rate.name}`)
        }

        return updatedRows
      })

      setRateModalVisible(false)
      setSelectedRowId(null)
    } catch (error) {
      console.error('Ошибка загрузки материалов для расценки:', error)

      // Все равно добавляем расценку, даже если материалы не загрузились
      setRows(currentRows => {
        const rowIndex = currentRows.findIndex(r => r.id === selectedRowId)
        if (rowIndex === -1) return currentRows

        let customerVolume = 0
        for (let i = rowIndex - 1; i >= 0; i--) {
          if (currentRows[i].rowType === 'Заказчик') {
            customerVolume = currentRows[i].volume || 0
            break
          }
        }

        return currentRows.map(row => {
          if (row.id === selectedRowId) {
            return {
              ...row,
              workName: rate.name,
              unit: rate.unit_short_name,
              workPrice: rate.base_price,
              rowType: 'раб',
              volume: customerVolume,
              workVolume: customerVolume,
            }
          }
          return row
        })
      })

      setRateModalVisible(false)
      setSelectedRowId(null)
      message.warning(
        `Добавлена расценка: ${rate.name} (материалы не загружены)`
      )
    }
  }

  const handleMaterialSelect = (material: MaterialWithUnit) => {
    if (!selectedRowId) return

    console.log('Выбран материал для строки', {
      rowId: selectedRowId,
      materialId: material.id,
      materialName: material.name,
      materialPrice: material.last_purchase_price,
      timestamp: new Date().toISOString(),
    })

    setRows(currentRows => {
      const rowIndex = currentRows.findIndex(r => r.id === selectedRowId)
      if (rowIndex === -1) return currentRows

      // Ищем ближайшую строку "раб" или "суб-раб" выше для получения объема
      let workVolume = 0
      for (let i = rowIndex - 1; i >= 0; i--) {
        if (
          currentRows[i].rowType === 'раб' ||
          currentRows[i].rowType === 'суб-раб'
        ) {
          workVolume = currentRows[i].volume || 0
          console.log('Найдена строка раб для нового материала', {
            workRow: currentRows[i].workName,
            workVolume,
          })
          break
        }
        // Если встретили "Заказчик", берем его объем
        if (currentRows[i].rowType === 'Заказчик') {
          workVolume = currentRows[i].volume || 0
          console.log('Найдена строка Заказчик для нового материала', {
            customerRow: currentRows[i].workName,
            volume: workVolume,
          })
          break
        }
      }

      return currentRows.map(row => {
        if (row.id === selectedRowId) {
          const materialCoef = row.materialCoef || 1
          const calculatedVolume = workVolume * materialCoef

          console.log('Расчет объема нового материала', {
            workVolume,
            materialCoef,
            calculatedVolume,
          })

          return {
            ...row,
            workName: material.name,
            unit: material.unit_short_name,
            matPriceNoDelivery: material.last_purchase_price || 0,
            matPriceWithDelivery: material.last_purchase_price || 0,
            rowType: 'мат',
            materialType: 'основ',
            volume: calculatedVolume,
            workVolume: calculatedVolume,
          }
        }
        return row
      })
    })

    setMaterialModalVisible(false)
    setSelectedRowId(null)
    message.success(`Добавлен материал: ${material.name}`)
  }

  const exportToJSON = () => {
    const data = {
      coefficients,
      rows,
      totals: calculateTotals(rows, coefficients),
      projectId: selectedProjectId,
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: 'application/json',
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `смета_${new Date().toISOString().split('T')[0]}.json`
    a.click()
    message.success('Смета экспортирована в JSON')
  }

  // Мутация для сохранения сметы
  const saveMutation = useMutation({
    mutationFn: async (name: string) => {
      if (!selectedProjectId) {
        throw new Error('Не выбран проект')
      }

      // Получаем текущего пользователя из Supabase Auth (необязательно)
      const {
        data: { user: currentUser },
      } = await supabase.auth.getUser()

      console.log('🔐 Информация о пользователе', {
        userId: currentUser?.id || 'Не авторизован',
        email: currentUser?.email || 'Нет email',
        timestamp: new Date().toISOString(),
      })

      // Автоматически сворачиваем все группы перед сохранением
      const collapsedRows = rows.map(row => {
        if (row.rowType === 'Заказчик') {
          return { ...row, isCollapsed: true }
        }
        return row
      })

      console.log('📦 Автоматическое сворачивание групп при сохранении', {
        totalRows: rows.length,
        customerRows: collapsedRows.filter(r => r.rowType === 'Заказчик')
          .length,
        timestamp: new Date().toISOString(),
      })

      const totals = calculateTotals(collapsedRows, coefficients)

      // Сохраняем данные в формате калькулятора (EstimateRow[])
      const estimateData: Record<string, unknown> = {
        project_id: selectedProjectId,
        name: name,
        status: 'final' as const,
        data: {
          rows: collapsedRows, // Сохраняем строки со свернутыми группами
          coefficients,
          totals: {
            totalMaterials: totals.totalMaterials,
            totalWorks: totals.totalWorks,
            totalDelivery: totals.totalDelivery,
            grandTotal: totals.grandTotal,
          },
          createdAt: new Date().toISOString(),
        },
        total_amount: totals.grandTotal,
      }

      // Добавляем created_by только если пользователь авторизован
      if (currentUser?.id) {
        estimateData.created_by = currentUser.id
      }

      // Добавляем access_level только если пользователь авторизован
      if (currentUser?.id) {
        estimateData.access_level = 'team' as const
      }

      console.log('💾 Сохранение сметы в БД', {
        name,
        projectId: selectedProjectId,
        positionsCount: rows.length,
        totalCost: totals.grandTotal,
        userId: currentUser?.id || 'Анонимный пользователь',
        isUpdate: !!currentEstimateId,
        estimateId: currentEstimateId,
        timestamp: new Date().toISOString(),
      })

      let data, error

      // Если есть currentEstimateId - обновляем существующую смету
      if (currentEstimateId) {
        console.log('🔄 Обновление существующей сметы', {
          estimateId: currentEstimateId,
          timestamp: new Date().toISOString(),
        })

        const result = await supabase
          .from('estimate_drafts')
          .update(estimateData)
          .eq('id', currentEstimateId)
          .select()
          .single()

        data = result.data
        error = result.error
      } else {
        // Иначе создаем новую смету
        console.log('➕ Создание новой сметы', {
          timestamp: new Date().toISOString(),
        })

        const result = await supabase
          .from('estimate_drafts')
          .insert([estimateData])
          .select()
          .single()

        data = result.data
        error = result.error
      }

      if (error) {
        console.error('❌ Ошибка сохранения сметы:', error)
        throw error
      }

      console.log('✅ Смета успешно сохранена:', data)
      return data
    },
    onSuccess: data => {
      // Обновляем UI - сворачиваем все группы
      setRows(currentRows =>
        currentRows.map(row => {
          if (row.rowType === 'Заказчик') {
            return { ...row, isCollapsed: true }
          }
          return row
        })
      )

      // Сохраняем ID сметы для последующих обновлений
      if (data?.id && !currentEstimateId) {
        setCurrentEstimateId(data.id)
        console.log('💾 Сохранен ID новой сметы для последующих обновлений', {
          estimateId: data.id,
          timestamp: new Date().toISOString(),
        })
      }

      queryClient.invalidateQueries({ queryKey: ['estimates', 'final'] })
      message.success(
        currentEstimateId
          ? 'Смета успешно обновлена!'
          : 'Смета успешно сохранена!'
      )
      setSaveModalVisible(false)
      setEstimateName('')

      console.log('✅ Смета сохранена, все группы свернуты', {
        wasUpdate: !!currentEstimateId,
        timestamp: new Date().toISOString(),
      })
    },
    onError: (error: Error) => {
      console.error('❌ Ошибка при сохранении:', error)
      message.error(`Ошибка: ${error.message}`)
    },
  })

  const handleSave = () => {
    if (!selectedProjectId) {
      message.warning('Выберите проект перед сохранением сметы')
      return
    }

    if (rows.length === 0) {
      message.warning('Невозможно сохранить пустую смету')
      return
    }

    setSaveModalVisible(true)
  }

  const handleSaveConfirm = () => {
    if (!estimateName.trim()) {
      message.warning('Введите название сметы')
      return
    }

    saveMutation.mutate(estimateName.trim())
  }

  const exportCustomerOfferToExcel = async (customerRows: any[]) => {
    console.log('Экспорт КП для заказчика в Excel', {
      rowsCount: customerRows.length,
      timestamp: new Date().toISOString(),
    })

    try {
      const XLSX = await import('xlsx-js-style')

      // Заголовки таблицы КП
      const headers = [
        '№',
        'Наименование работ',
        'Ед.изм.',
        'Объем',
        'Мат. в КП за ед.',
        'Раб. в КП за ед.',
        'Мат. в КП',
        'Раб. в КП',
        'ИТОГО',
      ]

      const data: unknown[][] = [headers]

      // Добавляем строки
      customerRows.forEach((row, index) => {
        data.push([
          index + 1,
          row.workName,
          row.unit,
          row.volume,
          row.materialsPerUnit,
          row.worksPerUnit,
          row.materialsInKP,
          row.worksInKP,
          row.total,
        ])
      })

      // Итоговая строка
      const totalMaterials = customerRows.reduce(
        (sum, row) => sum + row.materialsInKP,
        0
      )
      const totalWorks = customerRows.reduce(
        (sum, row) => sum + row.worksInKP,
        0
      )
      const grandTotal = totalMaterials + totalWorks

      data.push([
        '',
        '',
        '',
        'ИТОГО:',
        '',
        '',
        totalMaterials,
        totalWorks,
        grandTotal,
      ])

      const worksheet = XLSX.utils.aoa_to_sheet(data)

      // Устанавливаем ширину колонок
      worksheet['!cols'] = [
        { wch: 5 }, // №
        { wch: 50 }, // Наименование
        { wch: 10 }, // Ед.изм.
        { wch: 12 }, // Объем
        { wch: 18 }, // Мат за ед
        { wch: 18 }, // Раб за ед
        { wch: 18 }, // Мат в КП
        { wch: 18 }, // Раб в КП
        { wch: 18 }, // ИТОГО
      ]

      const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1')

      // Стилизация заголовка
      for (let C = 0; C <= range.e.c; ++C) {
        const cellAddress = XLSX.utils.encode_cell({ r: 0, c: C })
        if (!worksheet[cellAddress]) continue

        worksheet[cellAddress].s = {
          fill: { fgColor: { rgb: '1890FF' } },
          font: {
            bold: true,
            color: { rgb: 'FFFFFF' },
            sz: 12,
            name: 'Times New Roman',
          },
          alignment: { horizontal: 'center', vertical: 'center' },
          border: {
            top: { style: 'thin', color: { rgb: '000000' } },
            bottom: { style: 'thin', color: { rgb: '000000' } },
            left: { style: 'thin', color: { rgb: '000000' } },
            right: { style: 'thin', color: { rgb: '000000' } },
          },
        }
      }

      // Стилизация строк данных
      for (let R = 1; R < range.e.r; ++R) {
        for (let C = 0; C <= range.e.c; ++C) {
          const cellAddress = XLSX.utils.encode_cell({ r: R, c: C })
          if (!worksheet[cellAddress]) continue

          worksheet[cellAddress].s = {
            fill: { fgColor: { rgb: R % 2 === 0 ? 'F0F7FF' : 'FFFFFF' } },
            font: { sz: 11, name: 'Times New Roman' },
            alignment: {
              horizontal: C === 1 ? 'left' : C >= 3 ? 'right' : 'center',
              vertical: 'center',
            },
            border: {
              top: { style: 'thin', color: { rgb: 'D0D0D0' } },
              bottom: { style: 'thin', color: { rgb: 'D0D0D0' } },
              left: { style: 'thin', color: { rgb: 'D0D0D0' } },
              right: { style: 'thin', color: { rgb: 'D0D0D0' } },
            },
          }

          // Форматирование чисел
          if (C >= 4 && worksheet[cellAddress].v) {
            worksheet[cellAddress].z = '#,##0.00 ₽'
          } else if (C === 3) {
            worksheet[cellAddress].z = '0.00'
          }
        }
      }

      // Стилизация итоговой строки
      const summaryRow = range.e.r
      for (let C = 0; C <= range.e.c; ++C) {
        const cellAddress = XLSX.utils.encode_cell({ r: summaryRow, c: C })
        if (!worksheet[cellAddress]) continue

        worksheet[cellAddress].s = {
          fill: { fgColor: { rgb: 'FFF4CC' } },
          font: { bold: true, sz: 12, name: 'Times New Roman' },
          alignment: {
            horizontal: C >= 6 ? 'right' : 'center',
            vertical: 'center',
          },
          border: {
            top: { style: 'medium', color: { rgb: '000000' } },
            bottom: { style: 'medium', color: { rgb: '000000' } },
            left: { style: 'thin', color: { rgb: '000000' } },
            right: { style: 'thin', color: { rgb: '000000' } },
          },
        }

        if (C >= 6 && worksheet[cellAddress].v) {
          worksheet[cellAddress].z = '#,##0.00 ₽'
        }
      }

      const workbook = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(workbook, worksheet, 'КП для заказчика')

      const projectName = selectedProjectId
        ? projects.find(p => p.id === selectedProjectId)?.name || 'без_проекта'
        : 'без_проекта'
      const fileName = `КП_${projectName}_${new Date().toISOString().split('T')[0]}.xlsx`

      XLSX.writeFile(workbook, fileName)

      message.success('КП для заказчика экспортировано в Excel!')
      console.log('✅ Экспорт КП успешно завершен', { fileName })
    } catch (error) {
      console.error('❌ Ошибка экспорта КП в Excel:', error)
      message.error('Ошибка при экспорте КП в Excel')
    }
  }

  // Полный экспорт всех трех вкладок в один Excel файл
  const exportFullEstimateToExcel = async () => {
    console.log('📦 Полный экспорт всех трех вкладок в Excel', {
      rowsCount: rows.length,
      projectId: selectedProjectId,
      timestamp: new Date().toISOString(),
    })

    try {
      const XLSX = await import('xlsx-js-style')
      const workbook = XLSX.utils.book_new()

      // ============ ВКЛАДКА 1: Расчет сметы ============
      console.log('📄 Создание вкладки "Расчет сметы"...')
      const estimateSheet = await createEstimateWorksheet(XLSX)
      XLSX.utils.book_append_sheet(workbook, estimateSheet, 'Расчет сметы')

      // ============ ВКЛАДКА 2: Анализ для руководителей ============
      console.log('📊 Создание вкладки "Анализ для руководителей"...')
      const analysisSheet = await createAnalysisWorksheet(XLSX)
      XLSX.utils.book_append_sheet(
        workbook,
        analysisSheet,
        'Анализ для руководителей'
      )

      // ============ ВКЛАДКА 3: КП для заказчика ============
      console.log('📋 Создание вкладки "КП для заказчика"...')
      const customerSheet = await createCustomerOfferWorksheet(XLSX)
      XLSX.utils.book_append_sheet(workbook, customerSheet, 'КП для заказчика')

      // ============ ВКЛАДКА 4: Коэффициенты ============
      console.log('⚙️ Создание вкладки "Коэффициенты"...')
      const coeffsSheet = createCoefficientsWorksheet(XLSX)
      XLSX.utils.book_append_sheet(workbook, coeffsSheet, 'Коэффициенты')

      // Сохраняем файл
      const projectName = selectedProjectId
        ? projects.find(p => p.id === selectedProjectId)?.name || 'без_проекта'
        : 'без_проекта'
      const fileName = `Смета_${projectName}_${new Date().toISOString().split('T')[0]}.xlsx`

      XLSX.writeFile(workbook, fileName)

      message.success('Смета успешно экспортирована со всеми вкладками!')
      console.log('✅ Полный экспорт завершен', { fileName })
    } catch (error) {
      console.error('❌ Ошибка полного экспорта в Excel:', error)
      message.error('Ошибка при экспорте сметы в Excel')
    }
  }

  // Создание вкладки "Расчет сметы"
  const createEstimateWorksheet = (XLSX: any) => {
    // Заголовки таблицы
    const headers = [
      'Тип мат.',
      'Тип строки',
      'Наименование работ',
      'Ед.изм.',
      'Объем',
      'Коэф. расхода',
      'Объем раб.',
      'Цена раб.',
      'Цена мат без дост.',
      'Доставка',
      'Цена мат с дост.',
      'Итого',
      'Мат. в КП за ед.',
      'Раб. в КП за ед.',
      'Мат. в КП',
      'Раб. в КП',
    ]

    const data: unknown[][] = [headers]

    // Добавляем строки с формулами Excel
    rows.forEach((row, index) => {
      const rowNum = index + 2 // +2 потому что 1-я строка - заголовок

      const dataRow = [
        row.materialType || '',
        row.rowType || '',
        row.workName || '',
        row.unit || '',
        row.volume || 0,
        row.materialCoef || 1,
        row.workVolume || 0,
        row.workPrice || 0,
        row.matPriceNoDelivery || 0,
        row.delivery || 0,
        // K - Цена мат с дост = I + J
        { f: `I${rowNum}+J${rowNum}`, t: 'n' },
        // L - Итого = G * H + G * K (Объем раб * Цена раб + Объем раб * Цена мат с дост)
        { f: `G${rowNum}*H${rowNum}+G${rowNum}*K${rowNum}`, t: 'n' },
        // M - Мат в КП за ед. (будет вычислено после, пока 0)
        0,
        // N - Раб в КП за ед. (будет вычислено после, пока 0)
        0,
        // O - Мат в КП (будет вычислено после, пока 0)
        0,
        // P - Раб в КП (будет вычислено после, пока 0)
        0,
      ]
      data.push(dataRow)
    })

    // Теперь добавляем формулы для расчета "Мат в КП" и "Раб в КП" на основе типа строки
    rows.forEach((row, index) => {
      const rowNum = index + 2

      // Для строки "Заказчик" рассчитываем суммы из подчиненных строк
      if (row.rowType === 'Заказчик') {
        const customerTotals = calculateCustomerTotals(
          rows,
          index,
          coefficients
        )
        const volume = row.volume || 0

        // L - Итого (прямые затраты для группы)
        let totalDirectCosts = 0
        for (let i = index + 1; i < rows.length; i++) {
          const nextRow = rows[i]
          if (nextRow.rowType === 'Заказчик') break

          const calc = calculateRow(nextRow, coefficients)
          totalDirectCosts += calc.workPZ + calc.matPZ + calc.subPZ
        }

        data[index + 1][11] = totalDirectCosts // L - Итого
        data[index + 1][12] =
          volume > 0 ? customerTotals.materialsInKP / volume : 0 // M - Мат в КП за ед.
        data[index + 1][13] = volume > 0 ? customerTotals.worksInKP / volume : 0 // N - Раб в КП за ед.
        data[index + 1][14] = customerTotals.materialsInKP // O - Мат в КП
        data[index + 1][15] = customerTotals.worksInKP // P - Раб в КП
      } else {
        const calc = calculateRow(row, coefficients)

        // M и N оставляем пустыми для не-Заказчика (показываем только для Заказчик)
        data[index + 1][12] = ''
        data[index + 1][13] = ''

        // O - Мат в КП
        data[index + 1][14] = calc.materialsInKP

        // P - Раб в КП
        data[index + 1][15] = calc.worksInKP
      }
    })

    // Добавляем итоговые строки с формулами
    const lastRow = rows.length + 1

    // Прямые затраты
    data.push([
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      'Прямые затраты:',
      { f: `SUM(L2:L${lastRow})`, t: 'n' },
      '',
      '', // Пустые для "за ед."
      { f: `SUM(O2:O${lastRow})`, t: 'n' }, // Мат в КП
      { f: `SUM(P2:P${lastRow})`, t: 'n' }, // Раб в КП
    ])

    const summaryRow1 = rows.length + 2

    // ВСЕГО
    data.push([
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      'ВСЕГО:',
      '',
      '',
      '',
      { f: `O${summaryRow1}+P${summaryRow1}`, t: 'n' }, // Мат в КП + Раб в КП
      '', // Пустая последняя колонка
    ])

    const summaryRow2 = rows.length + 3

    // Коэффициент к прямым затратам = (Мат в КП + Раб в КП) / Прямые затраты в колонке L
    data.push([
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      'Коэф-т к прямым затратам:',
      '',
      '',
      '',
      {
        f: `IF(L${summaryRow1}=0,0,(O${summaryRow1}+P${summaryRow1})/L${summaryRow1})`,
        t: 'n',
      },
      '', // Пустая последняя колонка
    ])

    const worksheet = XLSX.utils.aoa_to_sheet(data)

    // Устанавливаем ширину колонок
    worksheet['!cols'] = [
      { wch: 10 }, // A - Тип мат.
      { wch: 12 }, // B - Тип строки
      { wch: 40 }, // C - Наименование
      { wch: 8 }, // D - Ед.изм.
      { wch: 10 }, // E - Объем
      { wch: 12 }, // F - Коэф. расхода
      { wch: 12 }, // G - Объем раб.
      { wch: 12 }, // H - Цена раб.
      { wch: 15 }, // I - Цена мат без дост.
      { wch: 12 }, // J - Доставка
      { wch: 15 }, // K - Цена мат с дост.
      { wch: 15 }, // L - Итого
      { wch: 15 }, // M - Мат. в КП
      { wch: 15 }, // N - Раб. в КП
      { wch: 18 }, // O - Мат. в КП за ед.
      { wch: 18 }, // P - Раб. в КП за ед.
    ]

    // Форматируем числовые ячейки и добавляем цвета
    const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1')

    // Стилизация заголовка (первая строка)
    for (let C = 0; C <= range.e.c; ++C) {
      const cellAddress = XLSX.utils.encode_cell({ r: 0, c: C })
      if (!worksheet[cellAddress]) continue

      worksheet[cellAddress].s = {
        fill: {
          fgColor: { rgb: '4472C4' }, // Синий цвет для заголовка
        },
        font: {
          bold: true,
          color: { rgb: 'FFFFFF' }, // Белый текст
          sz: 11,
          name: 'Times New Roman',
        },
        alignment: {
          horizontal: 'center',
          vertical: 'center',
        },
        border: {
          top: { style: 'thin', color: { rgb: '000000' } },
          bottom: { style: 'thin', color: { rgb: '000000' } },
          left: { style: 'thin', color: { rgb: '000000' } },
          right: { style: 'thin', color: { rgb: '000000' } },
        },
      }
    }

    // Форматирование строк данных
    for (let R = 1; R <= range.e.r; ++R) {
      // Определяем цвет строки на основе типа
      const rowData = data[R]
      let fillColor = 'FFFFFF' // По умолчанию белый
      let fontBold = false

      if (rowData && rowData[1]) {
        const rowType = rowData[1] as string
        if (rowType === 'Заказчик') {
          fillColor = 'FFFFFF' // Белый
          fontBold = true
        } else if (rowType === 'раб')
          fillColor = 'F8CBAD' // Оранжевый
        else if (rowType === 'суб-раб')
          fillColor = 'B4A7D6' // Фиолетовый
        else if (rowType === 'мат')
          fillColor = 'A4C2F4' // Голубой
        else if (rowType === 'суб-мат') fillColor = 'B6D7A8' // Зеленый
      }

      // Применяем цвет и стили ко всем ячейкам строки
      for (let C = 0; C <= range.e.c; ++C) {
        const cellAddress = XLSX.utils.encode_cell({ r: R, c: C })
        if (!worksheet[cellAddress]) continue

        worksheet[cellAddress].s = {
          fill: {
            fgColor: { rgb: fillColor },
          },
          font: {
            bold: fontBold,
            sz: 10,
            name: 'Times New Roman',
          },
          alignment: {
            horizontal: C >= 4 ? 'right' : 'left', // Числа справа, текст слева
            vertical: 'center',
          },
          border: {
            top: { style: 'thin', color: { rgb: 'D0D0D0' } },
            bottom: { style: 'thin', color: { rgb: 'D0D0D0' } },
            left: { style: 'thin', color: { rgb: 'D0D0D0' } },
            right: { style: 'thin', color: { rgb: 'D0D0D0' } },
          },
        }
      }

      // Форматируем числовые колонки
      // Объем (E), Коэф. расхода (F), Объем раб. (G)
      for (const col of [4, 5, 6]) {
        const cell = XLSX.utils.encode_cell({ r: R, c: col })
        if (worksheet[cell]) {
          worksheet[cell].z = col === 5 ? '0.000' : '0.00'
        }
      }

      // Цены и итоги (H, I, J, K, L, M, N, O, P)
      for (const col of [7, 8, 9, 10, 11, 12, 13, 14, 15]) {
        const cell = XLSX.utils.encode_cell({ r: R, c: col })
        if (worksheet[cell] && worksheet[cell].v !== '') {
          worksheet[cell].z = '#,##0.00 ₽'
        }
      }
    }

    // Стилизация итоговых строк
    const summaryRows = [rows.length + 1, rows.length + 2, rows.length + 3]
    summaryRows.forEach((R, index) => {
      for (let C = 0; C <= range.e.c; ++C) {
        const cellAddress = XLSX.utils.encode_cell({ r: R, c: C })
        if (!worksheet[cellAddress]) continue

        let fillColor = 'FAFAFA' // Светло-серый фон
        if (index === 0)
          fillColor = 'FFE5CC' // Оранжевый для "Прямые затраты"
        else if (index === 1)
          fillColor = 'FFF4CC' // Желтый для "ВСЕГО"
        else if (index === 2) fillColor = 'E6F4FF' // Голубой для "Коэффициент"

        worksheet[cellAddress].s = {
          fill: {
            fgColor: { rgb: fillColor },
          },
          font: {
            bold: true,
            sz: 11,
            color: { rgb: index === 1 ? 'FA8C16' : '000000' }, // Оранжевый текст для "ВСЕГО"
            name: 'Times New Roman',
          },
          alignment: {
            horizontal: C >= 10 ? 'right' : 'center',
            vertical: 'center',
          },
          border: {
            top: { style: 'medium', color: { rgb: '000000' } },
            bottom: { style: 'medium', color: { rgb: '000000' } },
            left: { style: 'thin', color: { rgb: 'D0D0D0' } },
            right: { style: 'thin', color: { rgb: 'D0D0D0' } },
          },
        }
      }
    })

    return worksheet
  }

  // Создание вкладки "Анализ для руководителей"
  const createAnalysisWorksheet = (XLSX: any) => {
    // Рассчитываем агрегированные финансовые показатели по всей смете
    let totalWorkPZ = 0
    let totalWorkSM = 0
    let totalMatMBP = 0
    let totalMatPZ = 0
    let totalSubPZ = 0
    let totalWarranty = 0
    let totalWork16 = 0

    rows.forEach(row => {
      if (row.rowType !== 'Заказчик') {
        const calc = calculateRow(row, coefficients)
        totalWorkPZ += calc.workPZ
        totalWorkSM += calc.workSM
        totalMatMBP += calc.matMBP
        totalMatPZ += calc.matPZ
        totalSubPZ += calc.subPZ
        totalWarranty += calc.warranty

        if (row.rowType === 'раб') {
          totalWork16 += calc.work16
        }
      }
    })

    // Расчеты показателей
    const workCalculated = totalWork16 - totalWorkPZ - totalWorkSM
    const workGrowth =
      (totalWorkPZ + workCalculated + totalWorkSM + totalMatMBP) *
      coefficients.workGrowth
    const matGrowth = totalMatPZ * coefficients.matGrowth
    const unforeseen =
      (totalWorkPZ + workCalculated + totalMatPZ + totalWorkSM + totalMatMBP) *
      coefficients.unforeseen
    const ooz =
      (totalWorkPZ +
        workCalculated +
        totalMatPZ +
        totalWorkSM +
        totalMatMBP +
        workGrowth +
        matGrowth +
        unforeseen) *
      coefficients.workMatOOZ
    const oozSub = totalSubPZ * coefficients.subOOZ
    const ofz =
      (totalWorkPZ +
        workCalculated +
        totalMatPZ +
        totalWorkSM +
        totalMatMBP +
        matGrowth +
        workGrowth +
        unforeseen +
        ooz) *
      coefficients.workMatOFZ
    const profit =
      (totalWorkPZ +
        workCalculated +
        totalMatPZ +
        totalWorkSM +
        totalMatMBP +
        matGrowth +
        workGrowth +
        unforeseen +
        ooz +
        ofz) *
      coefficients.workMatProfit
    const subProfit = (totalSubPZ + oozSub) * coefficients.subProfit

    // Данные таблицы
    const headers = [
      'Наименование затрат',
      'Прямые затраты',
      'Расчетные показатели',
    ]
    const data: unknown[][] = [headers]

    // Строки данных
    const rows_data = [
      ['Субподряд', totalSubPZ, ''],
      ['Работы', totalWorkPZ, workCalculated],
      ['Материалы', totalMatPZ, ''],
      [
        'Служба механизации раб (бурильщики, автотехника, электрики)',
        totalWorkSM,
        '',
      ],
      ['МБП+ГСМ (топливо+масло)', totalMatMBP, ''],
      ['Гарантийный период', totalWarranty, ''],
      ['Рост стоимости РАБОТ', '', workGrowth],
      ['Рост стоимости МАТЕРИАЛОВ', '', matGrowth],
      ['Непредвиденные затраты', '', unforeseen],
      ['ООЗ (Раб+Мат)', '', ooz],
      ['ООЗ Субподряд', '', oozSub],
      ['ОФЗ', '', ofz],
      ['Прибыль', '', profit],
      ['Коэф. генподряда на СУБПОДРЯД', '', subProfit],
    ]

    rows_data.forEach(row => data.push(row))

    // Итоговая строка
    const totalDirect =
      totalSubPZ +
      totalWorkPZ +
      totalMatPZ +
      totalWorkSM +
      totalMatMBP +
      totalWarranty
    const totalCalculated =
      workCalculated +
      workGrowth +
      matGrowth +
      unforeseen +
      ooz +
      oozSub +
      ofz +
      profit +
      subProfit
    data.push(['ИТОГО:', totalDirect, totalCalculated])

    const worksheet = XLSX.utils.aoa_to_sheet(data)

    // Ширина колонок
    worksheet['!cols'] = [
      { wch: 60 }, // Наименование
      { wch: 20 }, // Прямые затраты
      { wch: 25 }, // Расчетные показатели
    ]

    const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1')

    // Стилизация заголовка
    for (let C = 0; C <= range.e.c; ++C) {
      const cellAddress = XLSX.utils.encode_cell({ r: 0, c: C })
      if (!worksheet[cellAddress]) continue

      worksheet[cellAddress].s = {
        fill: { fgColor: { rgb: '4472C4' } },
        font: {
          bold: true,
          color: { rgb: 'FFFFFF' },
          sz: 12,
          name: 'Times New Roman',
        },
        alignment: { horizontal: 'center', vertical: 'center' },
        border: {
          top: { style: 'thin', color: { rgb: '000000' } },
          bottom: { style: 'thin', color: { rgb: '000000' } },
          left: { style: 'thin', color: { rgb: '000000' } },
          right: { style: 'thin', color: { rgb: '000000' } },
        },
      }
    }

    // Стилизация строк данных
    for (let R = 1; R < range.e.r; ++R) {
      for (let C = 0; C <= range.e.c; ++C) {
        const cellAddress = XLSX.utils.encode_cell({ r: R, c: C })
        if (!worksheet[cellAddress]) continue

        worksheet[cellAddress].s = {
          fill: { fgColor: { rgb: R % 2 === 0 ? 'F0F7FF' : 'FFFFFF' } },
          font: { sz: 11, name: 'Times New Roman' },
          alignment: {
            horizontal: C === 0 ? 'left' : 'right',
            vertical: 'center',
          },
          border: {
            top: { style: 'thin', color: { rgb: 'D0D0D0' } },
            bottom: { style: 'thin', color: { rgb: 'D0D0D0' } },
            left: { style: 'thin', color: { rgb: 'D0D0D0' } },
            right: { style: 'thin', color: { rgb: 'D0D0D0' } },
          },
        }

        // Форматирование чисел
        if (
          C > 0 &&
          worksheet[cellAddress].v &&
          worksheet[cellAddress].v !== ''
        ) {
          worksheet[cellAddress].z = '#,##0.00 ₽'
        }
      }
    }

    // Стилизация итоговой строки
    const summaryRow = range.e.r
    for (let C = 0; C <= range.e.c; ++C) {
      const cellAddress = XLSX.utils.encode_cell({ r: summaryRow, c: C })
      if (!worksheet[cellAddress]) continue

      worksheet[cellAddress].s = {
        fill: { fgColor: { rgb: 'FFF4CC' } },
        font: { bold: true, sz: 12, name: 'Times New Roman' },
        alignment: {
          horizontal: C === 0 ? 'left' : 'right',
          vertical: 'center',
        },
        border: {
          top: { style: 'medium', color: { rgb: '000000' } },
          bottom: { style: 'medium', color: { rgb: '000000' } },
          left: { style: 'thin', color: { rgb: '000000' } },
          right: { style: 'thin', color: { rgb: '000000' } },
        },
      }

      if (C > 0 && worksheet[cellAddress].v) {
        worksheet[cellAddress].z = '#,##0.00 ₽'
      }
    }

    return worksheet
  }

  // Создание вкладки "КП для заказчика"
  const createCustomerOfferWorksheet = (XLSX: any) => {
    // Получаем данные строк КП
    const customerRows = rows
      .map((row, index) => ({ row, index }))
      .filter(({ row }) => row.rowType === 'Заказчик')
      .map(({ row, index }) => {
        const customerTotals = calculateCustomerTotals(
          rows,
          index,
          coefficients
        )
        const volume = row.volume || 0
        return {
          workName: row.workName,
          unit: row.unit,
          volume: volume,
          materialsPerUnit:
            volume > 0 ? customerTotals.materialsInKP / volume : 0,
          worksPerUnit: volume > 0 ? customerTotals.worksInKP / volume : 0,
          materialsInKP: customerTotals.materialsInKP,
          worksInKP: customerTotals.worksInKP,
          total: customerTotals.materialsInKP + customerTotals.worksInKP,
        }
      })

    const headers = [
      '№',
      'Наименование работ',
      'Ед.изм.',
      'Объем',
      'Мат. в КП за ед.',
      'Раб. в КП за ед.',
      'Мат. в КП',
      'Раб. в КП',
      'ИТОГО',
    ]

    const data: unknown[][] = [headers]

    // Добавляем строки
    customerRows.forEach((row, index) => {
      data.push([
        index + 1,
        row.workName,
        row.unit,
        row.volume,
        row.materialsPerUnit,
        row.worksPerUnit,
        row.materialsInKP,
        row.worksInKP,
        row.total,
      ])
    })

    // Итоговая строка
    const totalMaterials = customerRows.reduce(
      (sum, row) => sum + row.materialsInKP,
      0
    )
    const totalWorks = customerRows.reduce((sum, row) => sum + row.worksInKP, 0)
    const grandTotal = totalMaterials + totalWorks

    data.push([
      '',
      '',
      '',
      'ИТОГО:',
      '',
      '',
      totalMaterials,
      totalWorks,
      grandTotal,
    ])

    const worksheet = XLSX.utils.aoa_to_sheet(data)

    // Ширина колонок
    worksheet['!cols'] = [
      { wch: 5 }, // №
      { wch: 50 }, // Наименование
      { wch: 10 }, // Ед.изм.
      { wch: 12 }, // Объем
      { wch: 18 }, // Мат за ед
      { wch: 18 }, // Раб за ед
      { wch: 18 }, // Мат в КП
      { wch: 18 }, // Раб в КП
      { wch: 18 }, // ИТОГО
    ]

    const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1')

    // Стилизация заголовка
    for (let C = 0; C <= range.e.c; ++C) {
      const cellAddress = XLSX.utils.encode_cell({ r: 0, c: C })
      if (!worksheet[cellAddress]) continue

      worksheet[cellAddress].s = {
        fill: { fgColor: { rgb: '1890FF' } },
        font: {
          bold: true,
          color: { rgb: 'FFFFFF' },
          sz: 12,
          name: 'Times New Roman',
        },
        alignment: { horizontal: 'center', vertical: 'center' },
        border: {
          top: { style: 'thin', color: { rgb: '000000' } },
          bottom: { style: 'thin', color: { rgb: '000000' } },
          left: { style: 'thin', color: { rgb: '000000' } },
          right: { style: 'thin', color: { rgb: '000000' } },
        },
      }
    }

    // Стилизация строк данных
    for (let R = 1; R < range.e.r; ++R) {
      for (let C = 0; C <= range.e.c; ++C) {
        const cellAddress = XLSX.utils.encode_cell({ r: R, c: C })
        if (!worksheet[cellAddress]) continue

        worksheet[cellAddress].s = {
          fill: { fgColor: { rgb: R % 2 === 0 ? 'F0F7FF' : 'FFFFFF' } },
          font: { sz: 11, name: 'Times New Roman' },
          alignment: {
            horizontal: C === 1 ? 'left' : C >= 3 ? 'right' : 'center',
            vertical: 'center',
          },
          border: {
            top: { style: 'thin', color: { rgb: 'D0D0D0' } },
            bottom: { style: 'thin', color: { rgb: 'D0D0D0' } },
            left: { style: 'thin', color: { rgb: 'D0D0D0' } },
            right: { style: 'thin', color: { rgb: 'D0D0D0' } },
          },
        }

        // Форматирование чисел
        if (C >= 4 && worksheet[cellAddress].v) {
          worksheet[cellAddress].z = '#,##0.00 ₽'
        } else if (C === 3) {
          worksheet[cellAddress].z = '0.00'
        }
      }
    }

    // Стилизация итоговой строки
    const summaryRow = range.e.r
    for (let C = 0; C <= range.e.c; ++C) {
      const cellAddress = XLSX.utils.encode_cell({ r: summaryRow, c: C })
      if (!worksheet[cellAddress]) continue

      worksheet[cellAddress].s = {
        fill: { fgColor: { rgb: 'FFF4CC' } },
        font: { bold: true, sz: 12, name: 'Times New Roman' },
        alignment: {
          horizontal: C >= 6 ? 'right' : 'center',
          vertical: 'center',
        },
        border: {
          top: { style: 'medium', color: { rgb: '000000' } },
          bottom: { style: 'medium', color: { rgb: '000000' } },
          left: { style: 'thin', color: { rgb: '000000' } },
          right: { style: 'thin', color: { rgb: '000000' } },
        },
      }

      if (C >= 6 && worksheet[cellAddress].v) {
        worksheet[cellAddress].z = '#,##0.00 ₽'
      }
    }

    return worksheet
  }

  // Создание вкладки "Коэффициенты"
  const createCoefficientsWorksheet = (XLSX: any) => {
    const coeffsData = [
      ['Коэффициент', 'Значение', 'Описание'],
      ['СМ', coefficients.sm, 'Работы СМ (строительный монтаж)'],
      ['МБП', coefficients.mbp, 'Материалы МБП'],
      ['Гарантия', coefficients.warranty, 'Гарантийный период'],
      ['Работы 1.6', coefficients.work16, 'Работы 1,6'],
      ['Работы рост', coefficients.workGrowth, 'Рост стоимости работ'],
      ['Мат рост', coefficients.matGrowth, 'Рост стоимости материалов'],
      ['Непредвиденные', coefficients.unforeseen, 'Непредвиденные расходы'],
      ['Суб ООЗ', coefficients.subOOZ, 'Субподряд ООЗ'],
      ['Р+М ООЗ', coefficients.workMatOOZ, 'Раб+Мат ООЗ'],
      ['Р+М ОФЗ', coefficients.workMatOFZ, 'Раб+Мат ОФЗ'],
      ['Р+М прибыль', coefficients.workMatProfit, 'Раб+Мат прибыль'],
      ['Суб прибыль', coefficients.subProfit, 'Субподряд прибыль'],
    ]
    const coeffsWorksheet = XLSX.utils.aoa_to_sheet(coeffsData)
    coeffsWorksheet['!cols'] = [{ wch: 20 }, { wch: 15 }, { wch: 40 }]

    const coeffsRange = XLSX.utils.decode_range(coeffsWorksheet['!ref'] || 'A1')

    // Заголовок
    for (let C = 0; C <= coeffsRange.e.c; ++C) {
      const cellAddress = XLSX.utils.encode_cell({ r: 0, c: C })
      if (!coeffsWorksheet[cellAddress]) continue

      coeffsWorksheet[cellAddress].s = {
        fill: { fgColor: { rgb: '52C41A' } },
        font: {
          bold: true,
          color: { rgb: 'FFFFFF' },
          sz: 11,
          name: 'Times New Roman',
        },
        alignment: { horizontal: 'center', vertical: 'center' },
        border: {
          top: { style: 'thin', color: { rgb: '000000' } },
          bottom: { style: 'thin', color: { rgb: '000000' } },
          left: { style: 'thin', color: { rgb: '000000' } },
          right: { style: 'thin', color: { rgb: '000000' } },
        },
      }
    }

    // Строки данных
    for (let R = 1; R <= coeffsRange.e.r; ++R) {
      for (let C = 0; C <= coeffsRange.e.c; ++C) {
        const cellAddress = XLSX.utils.encode_cell({ r: R, c: C })
        if (!coeffsWorksheet[cellAddress]) continue

        coeffsWorksheet[cellAddress].s = {
          fill: { fgColor: { rgb: R % 2 === 0 ? 'F6FFED' : 'FFFFFF' } },
          font: { sz: 10, name: 'Times New Roman' },
          alignment: {
            horizontal: C === 1 ? 'right' : 'left',
            vertical: 'center',
          },
          border: {
            top: { style: 'thin', color: { rgb: 'D0D0D0' } },
            bottom: { style: 'thin', color: { rgb: 'D0D0D0' } },
            left: { style: 'thin', color: { rgb: 'D0D0D0' } },
            right: { style: 'thin', color: { rgb: 'D0D0D0' } },
          },
        }
      }
    }

    return coeffsWorksheet
  }

  // Загрузка сметы из БД при монтировании компонента
  useEffect(() => {
    const loadEstimate = async () => {
      if (!estimateId) return

      console.log('📂 Загрузка сметы по ID:', estimateId)

      try {
        const { data: estimate, error } = await supabase
          .from('estimate_drafts')
          .select('*')
          .eq('id', estimateId)
          .single()

        if (error) {
          console.error('❌ Ошибка загрузки сметы:', error)
          message.error('Ошибка загрузки сметы')
          return
        }

        if (estimate && estimate.data) {
          console.log('✅ Смета загружена:', {
            id: estimate.id,
            name: estimate.name,
            rowsCount: estimate.data.rows?.length || 0,
          })

          setCurrentEstimateId(estimate.id)
          setEstimateName(estimate.name)
          setSelectedProjectId(estimate.project_id)

          // Загружаем строки калькулятора
          if (estimate.data.rows && Array.isArray(estimate.data.rows)) {
            setRows(estimate.data.rows)
          }

          // Загружаем коэффициенты
          if (estimate.data.coefficients) {
            setCoefficients(estimate.data.coefficients)
          }

          message.success(`Загружена смета: ${estimate.name}`)
        }
      } catch (error) {
        console.error('❌ Ошибка при загрузке сметы:', error)
        message.error('Ошибка загрузки сметы')
      }
    }

    loadEstimate()
  }, [estimateId])

  // Функция для получения видимых строк (скрывает свернутые группы)
  const getVisibleRows = (): EstimateRow[] => {
    const visibleRows: EstimateRow[] = []
    let skipUntilNextCustomer = false

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]

      if (row.rowType === 'Заказчик') {
        // Всегда показываем строку "Заказчик"
        visibleRows.push(row)
        // Если группа свернута, пропускаем все строки до следующего "Заказчик"
        skipUntilNextCustomer = row.isCollapsed || false
      } else if (!skipUntilNextCustomer) {
        // Показываем строку если группа не свернута
        visibleRows.push(row)
      }
    }

    return visibleRows
  }

  const visibleRows = getVisibleRows()
  const totals = calculateTotals(rows, coefficients)

  const columns: ColumnsType<EstimateRow> = [
    {
      title: 'Действия',
      key: 'actions',
      width: 150,
      fixed: 'left',
      render: (_, record) => (
        <Space size={4}>
          {record.rowType === 'Заказчик' && (
            <Button
              type="link"
              icon={record.isCollapsed ? <DownOutlined /> : <UpOutlined />}
              onClick={() => toggleCollapse(record.id)}
              size="small"
              title={
                record.isCollapsed ? 'Развернуть группу' : 'Свернуть группу'
              }
            />
          )}
          <Button
            type="link"
            icon={<PlusCircleOutlined />}
            onClick={() => insertRowAfter(record.id)}
            size="small"
            title="Вставить строку после"
            style={{ color: '#1890ff' }}
          />
          <Button
            type="link"
            icon={<SearchOutlined />}
            onClick={() => openRateModal(record.id)}
            size="small"
            title="Выбрать из расценок"
          />
          <Button
            type="link"
            icon={<SearchOutlined style={{ color: '#52c41a' }} />}
            onClick={() => openMaterialModal(record.id)}
            size="small"
            title="Выбрать из материалов"
          />
          <Button
            type="link"
            danger
            icon={<DeleteOutlined />}
            onClick={() => deleteRow(record.id)}
            size="small"
            title="Удалить"
          />
        </Space>
      ),
    },
    {
      title: 'Тип мат.',
      dataIndex: 'materialType',
      key: 'materialType',
      width: 100,
      render: (value, record) => (
        <Select
          value={value}
          onChange={val => updateRow(record.id, 'materialType', val)}
          size="small"
          style={{ width: '100%' }}
        >
          <Select.Option value="">-</Select.Option>
          <Select.Option value="основ">основ</Select.Option>
          <Select.Option value="вспом">вспом</Select.Option>
        </Select>
      ),
    },
    {
      title: 'Тип строки',
      dataIndex: 'rowType',
      key: 'rowType',
      width: 120,
      render: (value, record) => (
        <Select
          value={value}
          onChange={val => updateRow(record.id, 'rowType', val)}
          size="small"
          style={{ width: '100%' }}
        >
          <Select.Option value="Заказчик">Заказчик</Select.Option>
          <Select.Option value="раб">раб</Select.Option>
          <Select.Option value="мат">мат</Select.Option>
          <Select.Option value="суб-раб">суб-раб</Select.Option>
          <Select.Option value="суб-мат">суб-мат</Select.Option>
        </Select>
      ),
    },
    {
      title: 'Наименование работ',
      dataIndex: 'workName',
      key: 'workName',
      width: 300,
      render: (value, record) => (
        <input
          type="text"
          value={value}
          onChange={e => updateRow(record.id, 'workName', e.target.value)}
          style={{
            width: '100%',
            border: '1px solid #d9d9d9',
            padding: '4px 8px',
            borderRadius: 4,
          }}
        />
      ),
    },
    {
      title: 'Ед.изм.',
      dataIndex: 'unit',
      key: 'unit',
      width: 100,
      render: (value, record) => (
        <Select
          value={value}
          onChange={val => updateRow(record.id, 'unit', val)}
          size="small"
          style={{ width: '100%' }}
          showSearch
          filterOption={(input, option) =>
            (option?.children?.toString() || '')
              .toLowerCase()
              .includes(input.toLowerCase())
          }
          loading={unitsLoading}
        >
          {units.map(unit => (
            <Select.Option key={unit.id} value={unit.name}>
              {unit.name}
            </Select.Option>
          ))}
        </Select>
      ),
    },
    {
      title: 'Объем',
      dataIndex: 'volume',
      key: 'volume',
      width: 100,
      render: (value, record) => (
        <InputNumber
          value={value}
          onChange={val => updateRow(record.id, 'volume', val || 0)}
          size="small"
          style={{ width: '100%' }}
          step={0.01}
          title={
            record.rowType === 'Заказчик'
              ? 'Объем для всей группы (по умолчанию распространяется на все строки ниже)'
              : 'Объем можно изменить вручную или оставить значение из строки Заказчик'
          }
        />
      ),
    },
    {
      title: 'Коэф. расхода',
      dataIndex: 'materialCoef',
      key: 'materialCoef',
      width: 120,
      render: (value, record) => (
        <InputNumber
          value={value}
          onChange={val => updateRow(record.id, 'materialCoef', val || 1)}
          size="small"
          style={{ width: '100%' }}
          step={0.001}
          precision={3}
          disabled={record.rowType !== 'мат' && record.rowType !== 'суб-мат'}
          title={
            record.rowType === 'мат' || record.rowType === 'суб-мат'
              ? 'Коэффициент расхода материала (объем = объем верхней строки "раб" × коэффициент)'
              : 'Коэффициент доступен только для строк типа "мат"'
          }
        />
      ),
    },
    {
      title: 'Объем раб.',
      dataIndex: 'workVolume',
      key: 'workVolume',
      width: 100,
      render: (value, record) => (
        <InputNumber
          value={value}
          onChange={val => updateRow(record.id, 'workVolume', val || 0)}
          size="small"
          style={{ width: '100%' }}
          step={0.01}
        />
      ),
    },
    {
      title: 'Цена раб.',
      dataIndex: 'workPrice',
      key: 'workPrice',
      width: 120,
      render: (value, record) => (
        <InputNumber
          value={value}
          onChange={val => updateRow(record.id, 'workPrice', val || 0)}
          size="small"
          style={{ width: '100%' }}
          step={0.01}
        />
      ),
    },
    {
      title: 'Цена мат без дост.',
      dataIndex: 'matPriceNoDelivery',
      key: 'matPriceNoDelivery',
      width: 140,
      render: (value, record) => (
        <InputNumber
          value={value}
          onChange={val => updateRow(record.id, 'matPriceNoDelivery', val || 0)}
          size="small"
          style={{ width: '100%' }}
          step={0.01}
        />
      ),
    },
    {
      title: 'Доставка',
      dataIndex: 'delivery',
      key: 'delivery',
      width: 100,
      render: (value, record) => (
        <InputNumber
          value={value}
          onChange={val => updateRow(record.id, 'delivery', val || 0)}
          size="small"
          style={{ width: '100%' }}
          step={0.01}
        />
      ),
    },
    {
      title: 'Итого',
      key: 'total',
      width: 120,
      render: (_, record, index) => {
        // Для строки "Заказчик" показываем сумму прямых затрат подчиненных строк
        if (record.rowType === 'Заказчик') {
          let totalDirectCosts = 0

          for (let i = index + 1; i < rows.length; i++) {
            const row = rows[i]

            // Останавливаемся при встрече следующей строки "Заказчик"
            if (row.rowType === 'Заказчик') {
              break
            }

            const calc = calculateRow(row, coefficients)
            // Прямые затраты = workPZ + matPZ + subPZ (БЕЗ накруток: workSM, matMBP, warranty)
            totalDirectCosts += calc.workPZ + calc.matPZ + calc.subPZ
          }

          return (
            <strong style={{ color: '#ff7a45', fontSize: '13px' }}>
              {formatCurrencyWithSymbol(totalDirectCosts)}
            </strong>
          )
        }

        // Для остальных строк показываем обычное итого
        const calc = calculateRow(record, coefficients)
        return (
          <strong style={{ color: '#1890ff' }}>
            {formatCurrencyWithSymbol(calc.total)}
          </strong>
        )
      },
    },
    {
      title: 'Мат. в КП за ед.',
      key: 'materialsInKPPerUnit',
      width: 140,
      render: (_, record, index) => {
        // Показываем только для строки "Заказчик"
        if (record.rowType !== 'Заказчик') {
          return null
        }

        const customerTotals = calculateCustomerTotals(
          rows,
          index,
          coefficients
        )
        const volume = record.volume || 0

        // Мат. в КП за ед. = Мат. в КП / Объем
        const materialsPerUnit =
          volume > 0 ? customerTotals.materialsInKP / volume : 0

        return (
          <strong style={{ color: '#52c41a', fontSize: '12px' }}>
            {formatCurrencyWithSymbol(materialsPerUnit)}
          </strong>
        )
      },
    },
    {
      title: 'Раб. в КП за ед.',
      key: 'worksInKPPerUnit',
      width: 140,
      render: (_, record, index) => {
        // Показываем только для строки "Заказчик"
        if (record.rowType !== 'Заказчик') {
          return null
        }

        const customerTotals = calculateCustomerTotals(
          rows,
          index,
          coefficients
        )
        const volume = record.volume || 0

        // Раб. в КП за ед. = Раб. в КП / Объем
        const worksPerUnit = volume > 0 ? customerTotals.worksInKP / volume : 0

        return (
          <strong style={{ color: '#722ed1', fontSize: '12px' }}>
            {formatCurrencyWithSymbol(worksPerUnit)}
          </strong>
        )
      },
    },
    {
      title: 'Мат. в КП',
      key: 'materialsInKP',
      width: 130,
      render: (_, record, index) => {
        let materialsInKP = 0

        // Для строки "Заказчик" - суммируем из подчиненных строк "мат"
        if (record.rowType === 'Заказчик') {
          const customerTotals = calculateCustomerTotals(
            rows,
            index,
            coefficients
          )
          materialsInKP = customerTotals.materialsInKP
        } else {
          // Для остальных строк - рассчитываем как обычно
          const calc = calculateRow(record, coefficients)
          materialsInKP = calc.materialsInKP
        }

        return (
          <strong style={{ color: '#52c41a' }}>
            {formatCurrencyWithSymbol(materialsInKP)}
          </strong>
        )
      },
    },
    {
      title: 'Раб. в КП',
      key: 'worksInKP',
      width: 130,
      render: (_, record, index) => {
        let worksInKP = 0

        // Для строки "Заказчик" - суммируем из подчиненных строк "раб"
        if (record.rowType === 'Заказчик') {
          const customerTotals = calculateCustomerTotals(
            rows,
            index,
            coefficients
          )
          worksInKP = customerTotals.worksInKP
        } else {
          // Для остальных строк - рассчитываем как обычно
          const calc = calculateRow(record, coefficients)
          worksInKP = calc.worksInKP
        }

        return (
          <strong style={{ color: '#722ed1' }}>
            {formatCurrencyWithSymbol(worksInKP)}
          </strong>
        )
      },
    },
  ]

  // Компонент КП для заказчика
  const renderCustomerOffer = () => {
    // Фильтруем только строки "Заказчик"
    const customerRows = rows
      .map((row, index) => ({ row, index }))
      .filter(({ row }) => row.rowType === 'Заказчик')
      .map(({ row, index }) => {
        const customerTotals = calculateCustomerTotals(
          rows,
          index,
          coefficients
        )
        const volume = row.volume || 0

        return {
          key: row.id,
          workName: row.workName,
          unit: row.unit,
          volume: volume,
          materialsPerUnit:
            volume > 0 ? customerTotals.materialsInKP / volume : 0,
          worksPerUnit: volume > 0 ? customerTotals.worksInKP / volume : 0,
          materialsInKP: customerTotals.materialsInKP,
          worksInKP: customerTotals.worksInKP,
          total: customerTotals.materialsInKP + customerTotals.worksInKP,
        }
      })

    // Колонки для КП
    const customerOfferColumns = [
      {
        title: '№',
        key: 'index',
        width: 60,
        align: 'center' as const,
        render: (_: unknown, __: unknown, index: number) => index + 1,
      },
      {
        title: 'Наименование работ',
        dataIndex: 'workName',
        key: 'workName',
        width: 400,
        render: (text: string) => <strong>{text}</strong>,
      },
      {
        title: 'Ед.изм.',
        dataIndex: 'unit',
        key: 'unit',
        width: 100,
        align: 'center' as const,
      },
      {
        title: 'Объем',
        dataIndex: 'volume',
        key: 'volume',
        width: 100,
        align: 'right' as const,
        render: (value: number) => value.toFixed(2),
      },
      {
        title: 'Мат. в КП за ед.',
        dataIndex: 'materialsPerUnit',
        key: 'materialsPerUnit',
        width: 150,
        align: 'right' as const,
        render: (value: number) => (
          <strong style={{ color: '#52c41a' }}>
            {formatCurrencyWithSymbol(value)}
          </strong>
        ),
      },
      {
        title: 'Раб. в КП за ед.',
        dataIndex: 'worksPerUnit',
        key: 'worksPerUnit',
        width: 150,
        align: 'right' as const,
        render: (value: number) => (
          <strong style={{ color: '#722ed1' }}>
            {formatCurrencyWithSymbol(value)}
          </strong>
        ),
      },
      {
        title: 'Мат. в КП',
        dataIndex: 'materialsInKP',
        key: 'materialsInKP',
        width: 150,
        align: 'right' as const,
        render: (value: number) => (
          <strong style={{ color: '#52c41a' }}>
            {formatCurrencyWithSymbol(value)}
          </strong>
        ),
      },
      {
        title: 'Раб. в КП',
        dataIndex: 'worksInKP',
        key: 'worksInKP',
        width: 150,
        align: 'right' as const,
        render: (value: number) => (
          <strong style={{ color: '#722ed1' }}>
            {formatCurrencyWithSymbol(value)}
          </strong>
        ),
      },
      {
        title: 'ИТОГО',
        dataIndex: 'total',
        key: 'total',
        width: 150,
        align: 'right' as const,
        fixed: 'right' as const,
        render: (value: number) => (
          <strong style={{ color: '#1890ff', fontSize: '14px' }}>
            {formatCurrencyWithSymbol(value)}
          </strong>
        ),
      },
    ]

    // Итоговые суммы
    const totalMaterials = customerRows.reduce(
      (sum, row) => sum + row.materialsInKP,
      0
    )
    const totalWorks = customerRows.reduce((sum, row) => sum + row.worksInKP, 0)
    const grandTotal = totalMaterials + totalWorks

    return (
      <Card
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <FileTextOutlined style={{ fontSize: 24, color: '#1890ff' }} />
            <span style={{ fontSize: 18 }}>
              Коммерческое предложение для заказчика
            </span>
          </div>
        }
        extra={
          <Space>
            <Button
              type="primary"
              icon={<FileExcelOutlined />}
              onClick={() => exportCustomerOfferToExcel(customerRows)}
              style={{ background: '#52c41a' }}
            >
              Экспорт в Excel
            </Button>
          </Space>
        }
      >
        <Alert
          message="Упрощенное представление сметы для заказчика"
          description="Показаны только основные позиции работ с итоговыми ценами. Данные автоматически обновляются при изменении сметы."
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
        />

        <Table
          columns={customerOfferColumns}
          dataSource={customerRows}
          pagination={false}
          scroll={{ x: 'max-content' }}
          summary={() => (
            <Table.Summary>
              <Table.Summary.Row style={{ background: '#fafafa' }}>
                <Table.Summary.Cell index={0} colSpan={6} align="right">
                  <strong style={{ fontSize: 16 }}>ИТОГО:</strong>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={6} align="right">
                  <strong style={{ color: '#52c41a', fontSize: 16 }}>
                    {formatCurrencyWithSymbol(totalMaterials)}
                  </strong>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={7} align="right">
                  <strong style={{ color: '#722ed1', fontSize: 16 }}>
                    {formatCurrencyWithSymbol(totalWorks)}
                  </strong>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={8} align="right">
                  <strong style={{ color: '#1890ff', fontSize: 18 }}>
                    {formatCurrencyWithSymbol(grandTotal)}
                  </strong>
                </Table.Summary.Cell>
              </Table.Summary.Row>
            </Table.Summary>
          )}
          bordered
          size="middle"
        />

        {/* Дополнительная информация */}
        <Row gutter={16} style={{ marginTop: 24 }}>
          <Col span={8}>
            <Statistic
              title="Общая стоимость материалов"
              value={totalMaterials}
              precision={2}
              suffix="₽"
              valueStyle={{ color: '#52c41a' }}
            />
          </Col>
          <Col span={8}>
            <Statistic
              title="Общая стоимость работ"
              value={totalWorks}
              precision={2}
              suffix="₽"
              valueStyle={{ color: '#722ed1' }}
            />
          </Col>
          <Col span={8}>
            <Statistic
              title="Итоговая стоимость"
              value={grandTotal}
              precision={2}
              suffix="₽"
              valueStyle={{ color: '#1890ff', fontWeight: 'bold' }}
            />
          </Col>
        </Row>
      </Card>
    )
  }

  // Компонент анализа для руководителей
  const renderAnalysis = () => {
    // Группировка по Заказчикам
    const customerGroups: {
      name: string
      materialsInKP: number
      worksInKP: number
      total: number
      volume: number
      materialsPerUnit: number
      worksPerUnit: number
    }[] = []

    rows.forEach((row, index) => {
      if (row.rowType === 'Заказчик') {
        const customerTotals = calculateCustomerTotals(
          rows,
          index,
          coefficients
        )
        const volume = row.volume || 0
        customerGroups.push({
          name: row.workName || 'Без названия',
          materialsInKP: customerTotals.materialsInKP,
          worksInKP: customerTotals.worksInKP,
          total: customerTotals.materialsInKP + customerTotals.worksInKP,
          volume,
          materialsPerUnit:
            volume > 0 ? customerTotals.materialsInKP / volume : 0,
          worksPerUnit: volume > 0 ? customerTotals.worksInKP / volume : 0,
        })
      }
    })

    // Общая статистика
    const totalMaterialsInKP = customerGroups.reduce(
      (sum, g) => sum + g.materialsInKP,
      0
    )
    const totalWorksInKP = customerGroups.reduce(
      (sum, g) => sum + g.worksInKP,
      0
    )
    const grandTotal = totalMaterialsInKP + totalWorksInKP

    // Процентные соотношения
    const materialsPercentage =
      grandTotal > 0 ? (totalMaterialsInKP / grandTotal) * 100 : 0
    const worksPercentage =
      grandTotal > 0 ? (totalWorksInKP / grandTotal) * 100 : 0

    return (
      <div>
        <Title level={3}>
          <BarChartOutlined /> Аналитика сметы для руководителей
        </Title>

        {/* Таблица финансовых показателей */}
        <Card
          title={
            <>
              <DollarOutlined /> Финансовые показатели
            </>
          }
          style={{ marginTop: 16 }}
        >
          <Table
            dataSource={(() => {
              // Рассчитываем агрегированные финансовые показатели по всей смете
              let totalWorkPZ = 0
              let totalWorkSM = 0
              let totalMatMBP = 0
              let totalMatPZ = 0
              let totalSubPZ = 0
              let totalWarranty = 0
              let totalWork16 = 0 // Сумма "Работы 1,6" для всех строк типа "раб"

              rows.forEach(row => {
                if (row.rowType !== 'Заказчик') {
                  const calc = calculateRow(row, coefficients)
                  totalWorkPZ += calc.workPZ
                  totalWorkSM += calc.workSM
                  totalMatMBP += calc.matMBP
                  totalMatPZ += calc.matPZ
                  totalSubPZ += calc.subPZ
                  totalWarranty += calc.warranty

                  // Суммируем "Работы 1,6" только для строк типа "раб"
                  if (row.rowType === 'раб') {
                    console.log('📝 Строка "раб" - детальный расчет:', {
                      workName: row.workName,
                      workVolume: row.workVolume,
                      workPrice: row.workPrice,
                      total: calc.total,
                      workPZ: calc.workPZ,
                      workSM: calc.workSM,
                      work16: calc.work16,
                      формула_work16: `(${calc.workPZ} + ${calc.workSM}) * (1 + ${coefficients.work16}) = ${calc.work16}`,
                    })
                    totalWork16 += calc.work16
                  }
                }
              })

              // Расчеты по новым правилам
              // 2) Работы - расчетные показатели = Работы 1,6 - Прямые затраты - Служба механизации
              const workCalculated = totalWork16 - totalWorkPZ - totalWorkSM

              console.log('💰 Расчет строки "Работы - расчетные показатели":', {
                totalWork16, // Сумма "Работы 1,6" для всех строк "раб"
                totalWorkPZ, // Прямые затраты по работам
                totalWorkSM, // Служба механизации
                workCalculated, // Результат = totalWork16 - totalWorkPZ - totalWorkSM
                formula: `${totalWork16.toFixed(2)} - ${totalWorkPZ.toFixed(2)} - ${totalWorkSM.toFixed(2)} = ${workCalculated.toFixed(2)}`,
              })

              // 7) Рост стоимости работ = (работы прямые + работы расчетные + СМ + МБП) * коэф_workGrowth
              const workGrowth =
                (totalWorkPZ + workCalculated + totalWorkSM + totalMatMBP) *
                coefficients.workGrowth

              // 8) Рост стоимости материалов = материалы прямые * коэф_matGrowth
              const matGrowth = totalMatPZ * coefficients.matGrowth

              // 9) Непредвиденные = (работа ПЗ + работа расчетные + материалы ПЗ + СМ + МБП) * коэф_unforeseen
              const unforeseen =
                (totalWorkPZ +
                  workCalculated +
                  totalMatPZ +
                  totalWorkSM +
                  totalMatMBP) *
                coefficients.unforeseen

              // 10) ООЗ (Раб+Мат) = (работа ПЗ + работа расчетные + материалы ПЗ + СМ + МБП + рост работ + рост мат + непредв) * коэф_workMatOOZ
              const ooz =
                (totalWorkPZ +
                  workCalculated +
                  totalMatPZ +
                  totalWorkSM +
                  totalMatMBP +
                  workGrowth +
                  matGrowth +
                  unforeseen) *
                coefficients.workMatOOZ

              // 11) ООЗ субподряд = субподряд ПЗ * коэф_subOOZ
              const oozSub = totalSubPZ * coefficients.subOOZ

              // 12) ОФЗ = (работа ПЗ + работа расчетные + материалы ПЗ + СМ + МБП + рост мат + рост работ + непредв + ООЗ) * коэф_workMatOFZ
              const ofz =
                (totalWorkPZ +
                  workCalculated +
                  totalMatPZ +
                  totalWorkSM +
                  totalMatMBP +
                  matGrowth +
                  workGrowth +
                  unforeseen +
                  ooz) *
                coefficients.workMatOFZ

              // 13) Прибыль = (работа ПЗ + работа расчетные + материалы ПЗ + СМ + МБП + рост мат + рост работ + непредв + ООЗ + ОФЗ) * коэф_workMatProfit
              const profit =
                (totalWorkPZ +
                  workCalculated +
                  totalMatPZ +
                  totalWorkSM +
                  totalMatMBP +
                  matGrowth +
                  workGrowth +
                  unforeseen +
                  ooz +
                  ofz) *
                coefficients.workMatProfit

              // 14) Коэф. генподряда на субподряд = (субподряд ПЗ + ООЗ субподряд) * коэф_subProfit
              const subProfit = (totalSubPZ + oozSub) * coefficients.subProfit

              console.log('📊 Полный расчет анализа для руководителей:', {
                '1_Субподряд_ПЗ': totalSubPZ,
                '2_Работы_ПЗ': totalWorkPZ,
                '3_Работы_Расчетные': workCalculated,
                '4_Материалы_ПЗ': totalMatPZ,
                '5_СМ': totalWorkSM,
                '6_МБП': totalMatMBP,
                '7_Гарантия': totalWarranty,
                '8_Рост_работ': workGrowth,
                '9_Рост_материалов': matGrowth,
                '10_Непредвиденные': unforeseen,
                '11_ООЗ_Раб_Мат': ooz,
                '12_ООЗ_Субподряд': oozSub,
                '13_ОФЗ': ofz,
                '14_Прибыль': profit,
                '15_Коэф_генподряда': subProfit,
                формулы: {
                  workGrowth: `(${totalWorkPZ} + ${workCalculated} + ${totalWorkSM} + ${totalMatMBP}) * ${coefficients.workGrowth} = ${workGrowth}`,
                  matGrowth: `${totalMatPZ} * ${coefficients.matGrowth} = ${matGrowth}`,
                  unforeseen: `(${totalWorkPZ} + ${workCalculated} + ${totalMatPZ} + ${totalWorkSM} + ${totalMatMBP}) * ${coefficients.unforeseen} = ${unforeseen}`,
                  ooz: `(${totalWorkPZ} + ${workCalculated} + ${totalMatPZ} + ${totalWorkSM} + ${totalMatMBP} + ${workGrowth} + ${matGrowth} + ${unforeseen}) * ${coefficients.workMatOOZ} = ${ooz}`,
                  oozSub: `${totalSubPZ} * ${coefficients.subOOZ} = ${oozSub}`,
                  ofz: `(${totalWorkPZ} + ${workCalculated} + ${totalMatPZ} + ${totalWorkSM} + ${totalMatMBP} + ${matGrowth} + ${workGrowth} + ${unforeseen} + ${ooz}) * ${coefficients.workMatOFZ} = ${ofz}`,
                  profit: `(${totalWorkPZ} + ${workCalculated} + ${totalMatPZ} + ${totalWorkSM} + ${totalMatMBP} + ${matGrowth} + ${workGrowth} + ${unforeseen} + ${ooz} + ${ofz}) * ${coefficients.workMatProfit} = ${profit}`,
                  subProfit: `(${totalSubPZ} + ${oozSub}) * ${coefficients.subProfit} = ${subProfit}`,
                },
              })

              console.log('📊 Анализ для руководителей - расчеты:', {
                totalWorkPZ,
                totalWorkSM,
                totalMatMBP,
                totalMatPZ,
                totalSubPZ,
                totalWarranty,
                totalWorksInKP, // Новое значение - сумма "Раб в КП"
                workCalculated, // Должно быть = totalWorksInKP - totalWorkPZ - totalWorkSM
                workGrowth,
                matGrowth,
                unforeseen,
                ooz,
                oozSub,
                ofz,
                profit,
                subProfit,
                totalWorks_old: totals.totalWorks, // Старое значение для сравнения
                totalMaterials: totals.totalMaterials,
              })

              return [
                {
                  key: '1',
                  name: 'Субподряд',
                  directCosts: totalSubPZ,
                  calculated: null, // Пустое
                },
                {
                  key: '2',
                  name: 'Работы',
                  directCosts: totalWorkPZ,
                  calculated: workCalculated,
                },
                {
                  key: '3',
                  name: 'Материалы',
                  directCosts: totalMatPZ,
                  calculated: null, // Пустое
                },
                {
                  key: '4',
                  name: 'Служба механизации раб (бурильщики, автотехника, электрики)',
                  directCosts: totalWorkSM,
                  calculated: null, // Пустое
                },
                {
                  key: '5',
                  name: 'МБП+ГСМ (топливо+масло)',
                  directCosts: totalMatMBP,
                  calculated: null, // Пустое
                },
                {
                  key: '6',
                  name: 'Гарантийный период',
                  directCosts: totalWarranty,
                  calculated: null, // Пустое
                },
                {
                  key: '7',
                  name: 'Рост стоимости РАБОТ',
                  directCosts: null, // Пустое
                  calculated: workGrowth,
                },
                {
                  key: '8',
                  name: 'Рост стоимости МАТЕРИАЛОВ',
                  directCosts: null, // Пустое
                  calculated: matGrowth,
                },
                {
                  key: '9',
                  name: 'Непредвиденные затраты',
                  directCosts: null, // Пустое
                  calculated: unforeseen,
                },
                {
                  key: '10',
                  name: 'ООЗ (Раб+Мат)',
                  directCosts: null, // Пустое
                  calculated: ooz,
                },
                {
                  key: '11',
                  name: 'ООЗ Субподряд',
                  directCosts: null, // Пустое
                  calculated: oozSub,
                },
                {
                  key: '12',
                  name: 'ОФЗ',
                  directCosts: null, // Пустое
                  calculated: ofz,
                },
                {
                  key: '13',
                  name: 'Прибыль',
                  directCosts: null, // Пустое
                  calculated: profit,
                },
                {
                  key: '14',
                  name: 'Коэф. генподряда на СУБПОДРЯД',
                  directCosts: null, // Пустое
                  calculated: subProfit,
                },
              ]
            })()}
            pagination={false}
            size="small"
            bordered
            columns={[
              {
                title: 'Наименование затрат',
                dataIndex: 'name',
                key: 'name',
                width: 400,
                fixed: 'left',
              },
              {
                title: 'Прямые затраты',
                dataIndex: 'directCosts',
                key: 'directCosts',
                width: 180,
                align: 'right',
                render: val => {
                  if (val === null || val === undefined) return ''
                  return (
                    <span
                      style={{
                        fontWeight: val > 0 ? 'bold' : 'normal',
                        color: val > 0 ? '#1890ff' : '#999',
                      }}
                    >
                      {formatCurrencyWithSymbol(val)}
                    </span>
                  )
                },
              },
              {
                title: 'Расчетные показатели',
                dataIndex: 'calculated',
                key: 'calculated',
                width: 180,
                align: 'right',
                render: val => {
                  if (val === null || val === undefined) return ''
                  return (
                    <span style={{ fontWeight: 'bold', color: '#52c41a' }}>
                      {formatCurrencyWithSymbol(val)}
                    </span>
                  )
                },
              },
            ]}
            summary={() => {
              // Вычисляем прямые затраты (БЕЗ накруток: workSM, matMBP, warranty)
              const totalDirectCosts = rows.reduce((sum, row) => {
                if (row.rowType !== 'Заказчик') {
                  const calc = calculateRow(row, coefficients)
                  // Прямые затраты = workPZ + matPZ + subPZ (БЕЗ накруток)
                  return sum + calc.workPZ + calc.matPZ + calc.subPZ
                }
                return sum
              }, 0)

              const totalCalculated = customerGroups.reduce(
                (sum, g) => sum + g.total,
                0
              )

              return (
                <Table.Summary fixed>
                  <Table.Summary.Row
                    style={{ background: '#fafafa', fontWeight: 'bold' }}
                  >
                    <Table.Summary.Cell index={0} align="right">
                      ИТОГО:
                    </Table.Summary.Cell>
                    <Table.Summary.Cell index={1} align="right">
                      <span
                        style={{
                          color: '#1890ff',
                          fontWeight: 'bold',
                          fontSize: 14,
                        }}
                      >
                        {formatCurrencyWithSymbol(totalDirectCosts)}
                      </span>
                    </Table.Summary.Cell>
                    <Table.Summary.Cell index={2} align="right">
                      <span
                        style={{
                          color: '#52c41a',
                          fontWeight: 'bold',
                          fontSize: 14,
                        }}
                      >
                        {formatCurrencyWithSymbol(totalCalculated)}
                      </span>
                    </Table.Summary.Cell>
                  </Table.Summary.Row>
                </Table.Summary>
              )
            }}
          />
        </Card>
      </div>
    )
  }

  return (
    <div style={{ padding: 24 }}>
      <Title level={2}>Калькулятор смет</Title>

      {/* Блок выбора проекта */}
      <Card
        title={
          <Space>
            <ProjectOutlined />
            <span>Привязка к проекту</span>
          </Space>
        }
        size="small"
        style={{ marginBottom: 16 }}
      >
        <Row gutter={16} align="middle">
          <Col flex="auto">
            <Space direction="vertical" style={{ width: '100%' }}>
              <Text type="secondary">Выберите проект для привязки сметы</Text>
              <Select
                placeholder="Выберите проект"
                value={selectedProjectId}
                onChange={value => {
                  console.log('Выбран проект', {
                    projectId: value,
                    timestamp: new Date().toISOString(),
                  })
                  setSelectedProjectId(value)
                }}
                allowClear
                showSearch
                loading={projectsLoading}
                style={{ width: '100%', maxWidth: 400 }}
                filterOption={(input, option) => {
                  const text = option?.children?.toString() || ''
                  return text.toLowerCase().includes(input.toLowerCase())
                }}
              >
                {projects.map(project => (
                  <Select.Option key={project.id} value={project.id}>
                    {project.name}
                  </Select.Option>
                ))}
              </Select>
            </Space>
          </Col>
          {selectedProjectId && (
            <Col>
              <Alert
                type="success"
                message={`Проект: ${
                  projects.find(p => p.id === selectedProjectId)?.name || ''
                }`}
                showIcon
              />
            </Col>
          )}
        </Row>
      </Card>

      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        items={[
          {
            key: 'calculator',
            label: (
              <span>
                <CalculatorOutlined /> Расчет сметы
              </span>
            ),
            children: (
              <>
                <CoefficientsPanel
                  coefficients={coefficients}
                  onChange={setCoefficients}
                />

                <Space style={{ marginBottom: 16 }}>
                  <Button
                    type="primary"
                    icon={<PlusOutlined />}
                    onClick={addRow}
                  >
                    Добавить строку
                  </Button>
                  <Button
                    type="primary"
                    icon={<SaveOutlined />}
                    onClick={handleSave}
                    style={{ background: '#1890ff' }}
                    disabled={!selectedProjectId || rows.length === 0}
                    loading={saveMutation.isPending}
                  >
                    Сохранить смету
                  </Button>
                  <Button
                    type="primary"
                    icon={<FileExcelOutlined />}
                    onClick={exportFullEstimateToExcel}
                    style={{ background: '#52c41a' }}
                  >
                    Экспорт в Excel (с формулами)
                  </Button>
                  <Button icon={<DownloadOutlined />} onClick={exportToJSON}>
                    Экспорт JSON
                  </Button>
                </Space>

                <Table
                  columns={columns}
                  dataSource={visibleRows}
                  rowKey="id"
                  pagination={false}
                  scroll={{ x: 1600 }}
                  size="small"
                  bordered
                  loading={ratesLoading || materialsLoading}
                  onRow={record => ({
                    style: {
                      backgroundColor:
                        record.rowType === 'Заказчик'
                          ? '#ffffff'
                          : record.rowType === 'раб'
                            ? '#F8CBAD'
                            : record.rowType === 'суб-раб'
                              ? '#B4A7D6'
                              : record.rowType === 'мат'
                                ? '#A4C2F4'
                                : record.rowType === 'суб-мат'
                                  ? '#B6D7A8'
                                  : undefined,
                    },
                  })}
                  summary={() => {
                    // Вычисляем общую сумму прямых затрат (БЕЗ накруток: workSM, matMBP, warranty)
                    const totalDirectCosts = rows.reduce((sum, row) => {
                      if (row.rowType !== 'Заказчик') {
                        const calc = calculateRow(row, coefficients)
                        // Прямые затраты = workPZ + matPZ + subPZ (БЕЗ накруток)
                        return sum + calc.workPZ + calc.matPZ + calc.subPZ
                      }
                      return sum
                    }, 0)

                    // Вычисляем коэффициент к прямым затратам
                    const directCostsCoefficient =
                      totalDirectCosts > 0
                        ? (totals.totalMaterials + totals.totalWorks) /
                          totalDirectCosts
                        : 0

                    return (
                      <Table.Summary fixed>
                        <Table.Summary.Row
                          style={{ background: '#fafafa', fontWeight: 'bold' }}
                        >
                          <Table.Summary.Cell
                            index={0}
                            colSpan={10}
                            align="right"
                          >
                            Прямые затраты:
                          </Table.Summary.Cell>
                          <Table.Summary.Cell
                            index={10}
                            colSpan={1}
                            align="center"
                          >
                            <div
                              style={{
                                color: '#ff7a45',
                                fontSize: 16,
                                fontWeight: 'bold',
                              }}
                            >
                              {formatCurrencyWithSymbol(totalDirectCosts)}
                            </div>
                          </Table.Summary.Cell>
                          <Table.Summary.Cell index={11} />
                          <Table.Summary.Cell index={12}>
                            <div
                              style={{
                                color: '#52c41a',
                                fontSize: 16,
                                fontWeight: 'bold',
                              }}
                            >
                              {formatCurrencyWithSymbol(totals.totalMaterials)}
                            </div>
                          </Table.Summary.Cell>
                          <Table.Summary.Cell index={13}>
                            <div
                              style={{
                                color: '#722ed1',
                                fontSize: 16,
                                fontWeight: 'bold',
                              }}
                            >
                              {formatCurrencyWithSymbol(totals.totalWorks)}
                            </div>
                          </Table.Summary.Cell>
                        </Table.Summary.Row>
                        <Table.Summary.Row
                          style={{ background: '#fff7e6', fontWeight: 'bold' }}
                        >
                          <Table.Summary.Cell
                            index={0}
                            colSpan={11}
                            align="right"
                          >
                            ВСЕГО:
                          </Table.Summary.Cell>
                          <Table.Summary.Cell
                            index={11}
                            colSpan={3}
                            align="center"
                          >
                            <div
                              style={{
                                fontSize: 18,
                                fontWeight: 'bold',
                                color: '#fa8c16',
                              }}
                            >
                              {formatCurrencyWithSymbol(totals.grandTotal)}
                            </div>
                          </Table.Summary.Cell>
                        </Table.Summary.Row>
                        <Table.Summary.Row
                          style={{ background: '#e6f7ff', fontWeight: 'bold' }}
                        >
                          <Table.Summary.Cell
                            index={0}
                            colSpan={11}
                            align="right"
                          >
                            Коэф-т к прямым затратам:
                          </Table.Summary.Cell>
                          <Table.Summary.Cell
                            index={11}
                            colSpan={3}
                            align="center"
                          >
                            <div
                              style={{
                                fontSize: 16,
                                fontWeight: 'bold',
                                color: '#1890ff',
                              }}
                            >
                              {directCostsCoefficient.toFixed(2)}
                            </div>
                          </Table.Summary.Cell>
                        </Table.Summary.Row>
                      </Table.Summary>
                    )
                  }}
                />

                {/* Модальное окно выбора расценки */}
                <Modal
                  title="Выбор расценки из сборника"
                  open={rateModalVisible}
                  onCancel={() => {
                    setRateModalVisible(false)
                    setSelectedRowId(null)
                  }}
                  footer={null}
                  width={700}
                >
                  <div style={{ padding: '16px 0' }}>
                    <RateAutocomplete
                      rates={rates}
                      onSelect={handleRateSelect}
                    />
                  </div>
                </Modal>

                {/* Модальное окно выбора материала */}
                <Modal
                  title="Выбор материала из сборника"
                  open={materialModalVisible}
                  onCancel={() => {
                    setMaterialModalVisible(false)
                    setSelectedRowId(null)
                  }}
                  footer={null}
                  width={700}
                >
                  <div style={{ padding: '16px 0' }}>
                    <MaterialAutocomplete
                      materials={materials}
                      onSelect={handleMaterialSelect}
                    />
                  </div>
                </Modal>

                {/* Модальное окно сохранения сметы */}
                <Modal
                  title="Сохранение сметы"
                  open={saveModalVisible}
                  onOk={handleSaveConfirm}
                  onCancel={() => {
                    setSaveModalVisible(false)
                    setEstimateName('')
                  }}
                  okText="Сохранить"
                  cancelText="Отмена"
                  confirmLoading={saveMutation.isPending}
                >
                  <div style={{ padding: '16px 0' }}>
                    <Text>Введите название сметы:</Text>
                    <Input
                      value={estimateName}
                      onChange={e => setEstimateName(e.target.value)}
                      placeholder="Например: Смета на строительство корпуса А"
                      onPressEnter={handleSaveConfirm}
                      autoFocus
                      style={{ marginTop: 8 }}
                    />
                    <div style={{ marginTop: 16 }}>
                      <Text type="secondary">
                        Проект:{' '}
                        {projects.find(p => p.id === selectedProjectId)?.name}
                      </Text>
                    </div>
                    <div style={{ marginTop: 8 }}>
                      <Text type="secondary">
                        Позиций в смете: {rows.length}
                      </Text>
                    </div>
                    <div style={{ marginTop: 8 }}>
                      <Text type="secondary">
                        Общая стоимость:{' '}
                        {formatCurrencyWithSymbol(totals.grandTotal)}
                      </Text>
                    </div>
                  </div>
                </Modal>
              </>
            ),
          },
          {
            key: 'analysis',
            label: (
              <span>
                <BarChartOutlined /> Анализ для руководителей
              </span>
            ),
            children: renderAnalysis(),
          },
          {
            key: 'customer-offer',
            label: (
              <span>
                <FileTextOutlined /> КП для заказчика
              </span>
            ),
            children: renderCustomerOffer(),
          },
        ]}
      />
    </div>
  )
}

export default EstimateCalculatorDemo
