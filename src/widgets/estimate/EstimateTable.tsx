import React, { useState, useMemo } from 'react'
import { Table, Button, Input, Select, Space, Tooltip, Typography } from 'antd'
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  CaretRightOutlined,
  CaretDownOutlined,
  CommentOutlined,
  CalculatorOutlined,
} from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import {
  EstimatePosition,
  ESTIMATE_COLORS,
  JUSTIFICATION_TYPES,
  UNITS,
} from '@/shared/types/estimate'
import { useMaterialTypes } from '@/shared/hooks/useMaterialTypes'

const { Text } = Typography

interface EstimateTableProps {
  positions: EstimatePosition[]
  onPositionUpdate: (id: string, updates: Partial<EstimatePosition>) => void
  onPositionAdd: (parentId?: string) => void
  onPositionDelete: (id: string) => void
  onToggleExpanded: (id: string) => void
  selectedPositions: string[]
  onSelectionChange: (selectedIds: string[]) => void
  isEditing?: boolean
  searchTerm?: string
  editingCell?: { id: string; field: string } | null
  onEditingCellChange?: (cell: { id: string; field: string } | null) => void
}

export default function EstimateTable({
  positions,
  onPositionUpdate,
  onPositionAdd,
  onPositionDelete,
  onToggleExpanded,
  selectedPositions,
  onSelectionChange,
  searchTerm = '',
  editingCell: externalEditingCell,
  onEditingCellChange,
}: EstimateTableProps) {
  const [internalEditingCell, setInternalEditingCell] = useState<{
    id: string
    field: string
  } | null>(null)
  const { data: materialTypes = [] } = useMaterialTypes()

  // Используем внешний editingCell если он передан, иначе внутренний
  const editingCell =
    externalEditingCell !== undefined
      ? externalEditingCell
      : internalEditingCell

  // Функция для изменения editingCell
  const setEditingCell = (cell: { id: string; field: string } | null) => {
    if (onEditingCellChange) {
      onEditingCellChange(cell)
    } else {
      setInternalEditingCell(cell)
    }
  }

  // Функция для отображения типов материалов
  const getMaterialTypeDisplayName = (shortName: string): string => {
    const materialType = materialTypes.find(
      type => type.short_name === shortName
    )
    return materialType ? materialType.name : shortName
  }

  // const getRowStyle = (record: EstimatePosition) => {
  //   const colors = ESTIMATE_COLORS
  //   let backgroundColor = '#ffffff'

  //   if (selectedPositions.includes(record.id)) {
  //     backgroundColor = colors.selected.background
  //   } else if (record.isEdited) {
  //     backgroundColor = colors.edited.background
  //   } else {
  //     switch (record.justification) {
  //       case 'подрядчик':
  //         backgroundColor = colors.contractor.background
  //         break
  //       case 'раб':
  //         backgroundColor = colors.work.background
  //         break
  //       case 'мат':
  //         backgroundColor = colors.material.background
  //         break
  //     }
  //   }

  //   return { backgroundColor }
  // }

  const calculateTotal = (position: EstimatePosition): number => {
    return position.volume * position.workPrice
  }

  const handleCellEdit = (
    record: EstimatePosition,
    field: string,
    value: unknown
  ) => {
    const updates: Partial<EstimatePosition> = { [field]: value }

    if (field === 'volume' || field === 'workPrice') {
      updates.total = calculateTotal({ ...record, ...updates })
      updates.isEdited = true
      updates.updated_at = new Date().toISOString()
    }

    onPositionUpdate(record.id, updates)
    setEditingCell(null)

    console.log('Cell edited:', {
      positionId: record.id,
      field,
      value,
      newTotal: updates.total,
      timestamp: new Date().toISOString(),
    })
  }

  const renderEditableCell = (
    value: unknown,
    record: EstimatePosition,
    field: string,
    type: 'text' | 'number' | 'select' = 'text',
    options?: string[]
  ) => {
    const isEditing =
      editingCell?.id === record.id && editingCell?.field === field

    if (!isEditing) {
      return (
        <div
          onClick={() => !isEditing && setEditingCell({ id: record.id, field })}
          style={{
            cursor: !isEditing ? 'pointer' : 'default',
            minHeight: '32px',
            display: 'flex',
            alignItems: 'center',
          }}
        >
          {type === 'number' && typeof value === 'number'
            ? value.toLocaleString('ru-RU', { minimumFractionDigits: 2 })
            : value || '—'}
        </div>
      )
    }

    if (type === 'select') {
      return (
        <Select
          value={value}
          style={{ width: '100%' }}
          onChange={val => handleCellEdit(record, field, val)}
          autoFocus
          showSearch
          options={options?.map(opt => ({ label: opt, value: opt }))}
        />
      )
    }

    return (
      <Input
        defaultValue={value as string | number}
        type={type}
        style={{ width: '100%' }}
        onBlur={e =>
          handleCellEdit(
            record,
            field,
            type === 'number' ? Number(e.target.value) : e.target.value
          )
        }
        onPressEnter={e => {
          const target = e.target as globalThis.HTMLInputElement
          const value = type === 'number' ? Number(target.value) : target.value
          handleCellEdit(record, field, value)
        }}
        autoFocus
      />
    )
  }

  const flattenedPositions = useMemo(() => {
    const flatten = (
      positions: EstimatePosition[],
      level = 0
    ): EstimatePosition[] => {
      const result: EstimatePosition[] = []

      positions.forEach(position => {
        const flatPosition = { ...position, level }
        result.push(flatPosition)

        if (position.expanded && position.children) {
          result.push(...flatten(position.children, level + 1))
        }
      })

      return result
    }

    return flatten(positions)
  }, [positions])

  const filteredPositions = useMemo(() => {
    if (!searchTerm) return flattenedPositions

    return flattenedPositions.filter(
      position =>
        position.workName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        position.number.includes(searchTerm) ||
        position.justification.toLowerCase().includes(searchTerm.toLowerCase())
    )
  }, [flattenedPositions, searchTerm])

  const columns: ColumnsType<EstimatePosition> = [
    {
      title: '№ п/п',
      dataIndex: 'number',
      key: 'number',
      width: 100,
      fixed: 'left',
      render: (value, record) => (
        <div style={{ paddingLeft: record.level * 20 }}>
          {record.children && record.children.length > 0 && (
            <Button
              type="text"
              size="small"
              icon={
                record.expanded ? <CaretDownOutlined /> : <CaretRightOutlined />
              }
              onClick={e => {
                e.stopPropagation()
                onToggleExpanded(record.id)
              }}
              style={{ marginRight: 8, padding: 0, minWidth: 'auto' }}
            />
          )}
          <Text strong={record.level === 0}>{value}</Text>
        </div>
      ),
    },
    {
      title: 'Обоснование',
      dataIndex: 'justification',
      key: 'justification',
      width: 120,
      render: (value, record) =>
        renderEditableCell(value, record, 'justification', 'select', [
          ...JUSTIFICATION_TYPES,
        ]),
      filters: JUSTIFICATION_TYPES.map(type => ({ text: type, value: type })),
      onFilter: (value, record) => record.justification === value,
    },
    {
      title: 'Тип материала',
      dataIndex: 'materialType',
      key: 'materialType',
      width: 120,
      render: (value, record) => {
        const isEditing =
          editingCell?.id === record.id && editingCell?.field === 'materialType'

        if (!isEditing) {
          return (
            <div
              onClick={() =>
                setEditingCell({ id: record.id, field: 'materialType' })
              }
              style={{
                cursor: 'pointer',
                minHeight: '32px',
                display: 'flex',
                alignItems: 'center',
                padding: '4px 8px',
              }}
            >
              {value ? getMaterialTypeDisplayName(value) : ''}
            </div>
          )
        }

        return (
          <Select
            value={value}
            onChange={newValue => {
              onPositionUpdate(record.id, { materialType: newValue })
              setEditingCell(null)
            }}
            onBlur={() => setEditingCell(null)}
            style={{ width: '100%' }}
            size="small"
            autoFocus
            allowClear
            showSearch
            filterOption={(input, option) => {
              const text = (option?.children || option?.label)?.toString() || ''
              return text.toLowerCase().includes(input.toLowerCase())
            }}
          >
            {materialTypes.map(type => (
              <Select.Option key={type.id} value={type.short_name}>
                {type.name} ({type.short_name})
              </Select.Option>
            ))}
          </Select>
        )
      },
    },
    {
      title: 'Наименование работ',
      dataIndex: 'workName',
      key: 'workName',
      width: 400,
      render: (value, record) => renderEditableCell(value, record, 'workName'),
      filterDropdown: ({
        setSelectedKeys,
        selectedKeys,
        confirm,
        clearFilters,
      }) => (
        <div style={{ padding: 8 }}>
          <Input
            placeholder="Поиск по наименованию"
            value={selectedKeys[0]}
            onChange={e =>
              setSelectedKeys(e.target.value ? [e.target.value] : [])
            }
            onPressEnter={() => confirm()}
            style={{ marginBottom: 8, display: 'block' }}
          />
          <Space>
            <Button
              type="primary"
              onClick={() => confirm()}
              size="small"
              style={{ width: 90 }}
            >
              Найти
            </Button>
            <Button
              onClick={() => clearFilters?.()}
              size="small"
              style={{ width: 90 }}
            >
              Сброс
            </Button>
          </Space>
        </div>
      ),
      onFilter: (value, record) =>
        record.workName.toLowerCase().includes((value as string).toLowerCase()),
    },
    {
      title: 'Ед. изм.',
      dataIndex: 'unit',
      key: 'unit',
      width: 100,
      render: (value, record) =>
        renderEditableCell(value, record, 'unit', 'select', [...UNITS]),
    },
    {
      title: 'Объем',
      dataIndex: 'volume',
      key: 'volume',
      width: 120,
      render: (value, record) =>
        renderEditableCell(value, record, 'volume', 'number'),
      sorter: (a, b) => a.volume - b.volume,
    },
    {
      title: 'Норма расхода мат-лов',
      dataIndex: 'materialNorm',
      key: 'materialNorm',
      width: 150,
      render: (value, record) =>
        renderEditableCell(value, record, 'materialNorm', 'number'),
    },
    {
      title: 'Цена работ за ед.изм., руб.',
      dataIndex: 'workPrice',
      key: 'workPrice',
      width: 180,
      render: (value, record) =>
        renderEditableCell(value, record, 'workPrice', 'number'),
      sorter: (a, b) => a.workPrice - b.workPrice,
    },
    {
      title: 'Цена мат-лов, руб.',
      dataIndex: 'materialPrice',
      key: 'materialPrice',
      width: 150,
      render: (value, record) =>
        renderEditableCell(value, record, 'materialPrice', 'number'),
    },
    {
      title: 'Поставка материалов, руб.',
      dataIndex: 'deliveryPrice',
      key: 'deliveryPrice',
      width: 180,
      render: (value, record) =>
        renderEditableCell(value, record, 'deliveryPrice', 'number'),
    },
    {
      title: 'Итого, руб.',
      dataIndex: 'total',
      key: 'total',
      width: 150,
      render: value => (
        <Text strong style={{ color: '#16a34a' }}>
          {value?.toLocaleString('ru-RU', { minimumFractionDigits: 2 }) ||
            '0.00'}
        </Text>
      ),
      sorter: (a, b) => a.total - b.total,
    },
    {
      title: 'Действия',
      key: 'actions',
      width: 120,
      fixed: 'right',
      render: (_, record) => (
        <Space size="small">
          <Tooltip title="Добавить подпункт">
            <Button
              type="text"
              size="small"
              icon={<PlusOutlined />}
              onClick={e => {
                e.stopPropagation()
                onPositionAdd(record.id)
                console.log('Add subitem clicked:', record.id)
              }}
            />
          </Tooltip>
          <Tooltip title="Редактировать">
            <Button
              type="text"
              size="small"
              icon={<EditOutlined />}
              onClick={e => {
                e.stopPropagation()
                setEditingCell({ id: record.id, field: 'workName' })
                console.log('Edit clicked:', record.id)
              }}
            />
          </Tooltip>
          {record.comments && (
            <Tooltip title={record.comments}>
              <Button
                type="text"
                size="small"
                icon={<CommentOutlined />}
                style={{ color: '#1677ff' }}
                onClick={e => e.stopPropagation()}
              />
            </Tooltip>
          )}
          <Tooltip title="Удалить">
            <Button
              type="text"
              size="small"
              icon={<DeleteOutlined />}
              danger
              onClick={e => {
                e.stopPropagation()
                console.log('Delete button clicked for record:', record)
                console.log('Calling onPositionDelete with id:', record.id)
                onPositionDelete(record.id)
              }}
            />
          </Tooltip>
        </Space>
      ),
    },
  ]

  const rowSelection = {
    selectedRowKeys: selectedPositions,
    onChange: (selectedRowKeys: React.Key[]) =>
      onSelectionChange(selectedRowKeys as string[]),
    getCheckboxProps: (record: EstimatePosition) => ({
      name: record.workName,
    }),
  }

  return (
    <>
      <style>{`
        .estimate-row-contractor {
          background-color: ${ESTIMATE_COLORS.contractor.background} !important;
        }
        .estimate-row-work {
          background-color: ${ESTIMATE_COLORS.work.background} !important;
        }
        .estimate-row-material {
          background-color: ${ESTIMATE_COLORS.material.background} !important;
        }
        .estimate-row-edited {
          background-color: ${ESTIMATE_COLORS.edited.background} !important;
          border-left: 3px solid ${ESTIMATE_COLORS.edited.border};
        }
        .estimate-row-selected {
          background-color: ${ESTIMATE_COLORS.selected.background} !important;
        }
      `}</style>
      <Table
        columns={columns}
        dataSource={filteredPositions}
        rowKey="id"
        sticky
        scroll={{
          x: 1800,
          y: 'calc(100vh - 400px)',
        }}
        rowSelection={rowSelection}
        pagination={false}
        size="small"
        rowClassName={record => {
          let className = ''
          if (selectedPositions.includes(record.id)) {
            className += 'estimate-row-selected '
          } else if (record.isEdited) {
            className += 'estimate-row-edited '
          } else {
            switch (record.justification) {
              case 'подрядчик':
                className += 'estimate-row-contractor '
                break
              case 'раб':
                className += 'estimate-row-work '
                break
              case 'мат':
                className += 'estimate-row-material '
                break
            }
          }
          return className.trim()
        }}
        onRow={record => ({
          onClick: e => {
            // Не обрабатываем клик, если это клик по кнопке или чекбоксу
            const target = e.target as globalThis.HTMLElement
            if (
              target.closest('button') ||
              target.closest('.ant-checkbox-wrapper') ||
              target.closest('.ant-select')
            ) {
              return
            }

            console.log('Row clicked:', record.id)
            // Переключаем выбор строки
            const isSelected = selectedPositions.includes(record.id)
            if (isSelected) {
              onSelectionChange(
                selectedPositions.filter(id => id !== record.id)
              )
            } else {
              onSelectionChange([...selectedPositions, record.id])
            }
          },
        })}
        summary={data => {
          const total = data.reduce((sum, item) => sum + (item.total || 0), 0)
          const workTotal = data
            .filter(item => item.justification === 'раб')
            .reduce((sum, item) => sum + (item.total || 0), 0)
          const materialTotal = data
            .filter(item => item.justification === 'мат')
            .reduce((sum, item) => sum + (item.total || 0), 0)

          return (
            <Table.Summary fixed>
              {/* Итого работ */}
              <Table.Summary.Row
                style={{ backgroundColor: '#fff7ed', fontWeight: 500 }}
              >
                <Table.Summary.Cell index={0} colSpan={10}>
                  <Text strong>Итого работ:</Text>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={11}>
                  <Text strong style={{ color: '#f97316' }}>
                    {workTotal.toLocaleString('ru-RU', {
                      minimumFractionDigits: 2,
                    })}{' '}
                    руб.
                  </Text>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={12} />
              </Table.Summary.Row>

              {/* Итого материалов */}
              <Table.Summary.Row
                style={{ backgroundColor: '#eff6ff', fontWeight: 500 }}
              >
                <Table.Summary.Cell index={0} colSpan={10}>
                  <Text strong>Итого материалов:</Text>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={11}>
                  <Text strong style={{ color: '#3b82f6' }}>
                    {materialTotal.toLocaleString('ru-RU', {
                      minimumFractionDigits: 2,
                    })}{' '}
                    руб.
                  </Text>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={12} />
              </Table.Summary.Row>

              {/* Всего по смете */}
              <Table.Summary.Row
                style={{
                  backgroundColor: '#f0fdf4',
                  fontWeight: 'bold',
                  fontSize: '16px',
                }}
              >
                <Table.Summary.Cell index={0} colSpan={10}>
                  <Space>
                    <CalculatorOutlined style={{ color: '#16a34a' }} />
                    <Text strong style={{ fontSize: '16px' }}>
                      Всего по смете:
                    </Text>
                  </Space>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={11}>
                  <Text strong style={{ color: '#16a34a', fontSize: '16px' }}>
                    {total.toLocaleString('ru-RU', {
                      minimumFractionDigits: 2,
                    })}{' '}
                    руб.
                  </Text>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={12} />
              </Table.Summary.Row>
            </Table.Summary>
          )
        }}
      />
    </>
  )
}
