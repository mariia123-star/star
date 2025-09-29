import React, { useState } from 'react'
import { Card, Button, Typography, Space, Input, InputNumber } from 'antd'
import {
  BuildOutlined,
  ToolOutlined,
  InboxOutlined,
  CaretUpOutlined,
  CaretDownOutlined,
  EditOutlined,
  DeleteOutlined,
  CopyOutlined,
  ExportOutlined
} from '@ant-design/icons'
import { RateGroup, RATE_COLORS } from '@/shared/types/estimate'

const { Title, Text } = Typography

interface RateBlockProps {
  group: RateGroup
  onEdit?: (groupId: string) => void
  onDelete?: (groupId: string) => void
  onDuplicate?: (groupId: string) => void
  onUpdatePosition?: (positionId: string, updates: Partial<Record<string, unknown>>) => void
  onExportToEstimate?: (groupId: string) => void
  exportingGroup?: string | null
  selectedProjectId?: string | null
}

export default function RateBlock({ group, onEdit, onDelete, onDuplicate, onUpdatePosition, onExportToEstimate, exportingGroup, selectedProjectId }: RateBlockProps) {
  const [isExpanded, setIsExpanded] = useState(group.isExpanded ?? true)
  const [editingField, setEditingField] = useState<{ positionId: string; field: string } | null>(null)

  const formatCurrency = (amount: number): string => {
    return amount.toLocaleString('ru-RU', {
      style: 'currency',
      currency: 'RUB',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    })
  }

  const contractorHeaderStyle = {
    background: RATE_COLORS.contractor.background,
    color: RATE_COLORS.contractor.text,
    padding: '16px',
    borderRadius: '8px 8px 0 0'
  }

  const workItemStyle = {
    background: RATE_COLORS.work.background,
    color: RATE_COLORS.work.text,
    padding: '12px 16px',
    margin: '8px 16px',
    borderRadius: '6px',
    borderLeft: `4px solid #4A6741`
  }

  const materialMainStyle = {
    background: RATE_COLORS.materialMain.background,
    color: RATE_COLORS.materialMain.text,
    padding: '12px 16px',
    margin: '8px 16px',
    borderRadius: '6px',
    borderLeft: `4px solid ${RATE_COLORS.materialMain.border}`
  }

  const materialAuxStyle = {
    background: RATE_COLORS.materialAux.background,
    color: RATE_COLORS.materialAux.text,
    padding: '12px 16px',
    margin: '8px 16px',
    borderRadius: '6px',
    borderLeft: `4px solid ${RATE_COLORS.materialAux.border}`
  }

  // Функции для inline редактирования
  const handleFieldEdit = (positionId: string, field: string, value: unknown) => {
    if (!onUpdatePosition) return

    const numericFields = ['volume', 'consumptionRate', 'workPrice', 'materialPrice', 'deliveryPrice']
    const parsedValue = numericFields.includes(field) ? Number(value) || 0 : value

    onUpdatePosition(positionId, { [field]: parsedValue })
    setEditingField(null)
  }

  const renderEditableField = (position: RatePosition, field: string, value: unknown, isNumeric = false) => {
    const isEditing = editingField?.positionId === (position.id as string) && editingField?.field === field

    if (isEditing) {
      if (isNumeric) {
        return (
          <InputNumber
            size="small"
            value={value}
            onChange={(newValue) => handleFieldEdit(position.id as string, field, newValue)}
            onBlur={() => {}} // onBlur обрабатывается через onChange
            autoFocus
            style={{ minWidth: 80 }}
          />
        )
      } else {
        return (
          <Input
            size="small"
            value={value}
            onPressEnter={(e) => handleFieldEdit(position.id as string, field, (e.target as globalThis.HTMLInputElement).value)}
            onBlur={(e) => handleFieldEdit(position.id as string, field, e.target.value)}
            autoFocus
            style={{ minWidth: 100 }}
          />
        )
      }
    }

    return (
      <span
        onClick={() => setEditingField({ positionId: position.id as string, field })}
        style={{
          cursor: 'pointer',
          padding: '2px 4px',
          borderRadius: '2px',
          transition: 'background-color 0.2s'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.05)'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = 'transparent'
        }}
      >
        {isNumeric && typeof value === 'number'
          ? formatCurrency(value)
          : (value as string) || '—'
        }
      </span>
    )
  }

  return (
    <Card
      className="mb-4"
      style={{
        boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
        border: '2px solid #E5E7EB',
        borderRadius: '8px',
        overflow: 'hidden'
      }}
      styles={{ body: { padding: 0 } }}
    >
      {/* Заголовок заказчика */}
      <div style={contractorHeaderStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <BuildOutlined style={{ fontSize: '20px' }} />
            <div>
              <Title level={4} style={{ color: RATE_COLORS.contractor.text, margin: 0 }}>
                ЗАКАЗЧИК: {renderEditableField(group.contractor, 'name', group.contractor.name)}
              </Title>
              <Text style={{ color: RATE_COLORS.contractor.text, opacity: 0.9 }}>
                {renderEditableField(group.contractor, 'unit', group.contractor.unit)} × {renderEditableField(group.contractor, 'volume', group.contractor.volume, true)} | {renderEditableField(group.contractor, 'workPrice', group.contractor.workPrice, true)} за ед.
              </Text>
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: RATE_COLORS.contractor.text }}>
              {formatCurrency(group.totalSum)}
            </div>
            <Button
              type="text"
              size="small"
              icon={isExpanded ? <CaretUpOutlined /> : <CaretDownOutlined />}
              onClick={() => setIsExpanded(!isExpanded)}
              style={{ color: RATE_COLORS.contractor.text }}
            />
          </div>
        </div>
      </div>

      {/* Развернутое содержимое */}
      {isExpanded && (
        <div>
          {/* Работы */}
          {group.works.map((work, index) => (
            <div key={`work-${index}`} style={workItemStyle}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <ToolOutlined style={{ fontSize: '16px' }} />
                  <span>РАБОТЫ: {renderEditableField(work, 'name', work.name)}</span>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <Text style={{ color: RATE_COLORS.work.text, fontSize: '12px', opacity: 0.9 }}>
                    {renderEditableField(work, 'unit', work.unit)} × {renderEditableField(work, 'volume', work.volume, true)} | Цена работ: {renderEditableField(work, 'workPrice', work.workPrice, true)}
                  </Text>
                  <div style={{ fontWeight: 600, color: RATE_COLORS.work.text }}>
                    {formatCurrency(work.total)}
                  </div>
                </div>
              </div>
            </div>
          ))}

          {/* Материалы */}
          {group.materials.map((material, index) => (
            <div
              key={`material-${index}`}
              style={material.materialType === 'Основной' ? materialMainStyle : materialAuxStyle}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <InboxOutlined style={{ fontSize: '16px' }} />
                  <span>
                    МАТЕРИАЛЫ: {renderEditableField(material, 'materialType', material.materialType)} - {renderEditableField(material, 'name', material.name)}
                  </span>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <Text style={{
                    color: material.materialType === 'Основной' ? RATE_COLORS.materialMain.text : RATE_COLORS.materialAux.text,
                    fontSize: '12px',
                    opacity: 0.75
                  }}>
                    {renderEditableField(material, 'unit', material.unit)} × {renderEditableField(material, 'volume', material.volume, true)} |
                    Цена: {renderEditableField(material, 'materialPrice', material.materialPrice, true)}
                    {material.deliveryPrice > 0 && ` + доставка: ${renderEditableField(material, 'deliveryPrice', material.deliveryPrice, true)}`}
                  </Text>
                  <div style={{
                    fontWeight: 600,
                    color: material.materialType === 'Основной' ? RATE_COLORS.materialMain.text : RATE_COLORS.materialAux.text
                  }}>
                    {formatCurrency(material.total)}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Футер с общим итогом и действиями */}
      <div style={{
        background: '#f8f9fa',
        padding: '16px',
        borderTop: '2px solid #E5E7EB',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <Space>
          <Button
            size="small"
            icon={<EditOutlined />}
            onClick={() => onEdit?.(group.id)}
          >
            Изменить
          </Button>
          <Button
            size="small"
            icon={<DeleteOutlined />}
            danger
            onClick={() => onDelete?.(group.id)}
          >
            Удалить
          </Button>
          <Button
            size="small"
            icon={<CopyOutlined />}
            onClick={() => onDuplicate?.(group.id)}
          >
            Дублировать
          </Button>
          <Button
            size="small"
            type="primary"
            icon={<ExportOutlined />}
            onClick={() => onExportToEstimate?.(group.id)}
            loading={exportingGroup === group.id}
            disabled={!selectedProjectId || !onExportToEstimate}
            title={
              !selectedProjectId
                ? 'Сначала выберите проект для экспорта'
                : 'Экспортировать группу в смету'
            }
            style={{
              background: selectedProjectId ? '#52c41a' : undefined,
              borderColor: selectedProjectId ? '#52c41a' : undefined
            }}
          >
            В смету
          </Button>
        </Space>
        <div style={{ fontSize: '18px', fontWeight: 'bold' }}>
          ИТОГО: <span style={{ color: '#1677ff' }}>{formatCurrency(group.totalSum)}</span>
        </div>
      </div>
    </Card>
  )
}