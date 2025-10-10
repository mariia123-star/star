import React, { useState, useEffect } from 'react'
import { AutoComplete, Space, Tag, Typography } from 'antd'
import { SearchOutlined } from '@ant-design/icons'
import type { MaterialWithUnit } from '@/entities/materials'

const { Text } = Typography

interface MaterialAutocompleteProps {
  materials: MaterialWithUnit[]
  onSelect: (material: MaterialWithUnit) => void
  placeholder?: string
  value?: string
  onChange?: (value: string) => void
}

interface MaterialOption {
  value: string
  label: React.ReactNode
  material: MaterialWithUnit
}

export const MaterialAutocomplete: React.FC<MaterialAutocompleteProps> = ({
  materials,
  onSelect,
  placeholder = 'Начните вводить: бетон, арматура, кирпич...',
  value,
  onChange,
}) => {
  const [searchValue, setSearchValue] = useState(value || '')
  const [options, setOptions] = useState<MaterialOption[]>([])

  useEffect(() => {
    if (value !== undefined) {
      setSearchValue(value)
    }
  }, [value])

  // Фильтрация материалов по поисковому запросу
  useEffect(() => {
    if (searchValue.trim().length > 0) {
      const filtered = materials.filter(
        material =>
          material.name.toLowerCase().includes(searchValue.toLowerCase()) ||
          material.code.toLowerCase().includes(searchValue.toLowerCase()) ||
          (material.description &&
            material.description
              .toLowerCase()
              .includes(searchValue.toLowerCase()))
      )

      const mappedOptions: MaterialOption[] = filtered
        .slice(0, 50)
        .map(material => ({
          value: material.id,
          label: (
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'start',
                padding: '8px 0',
              }}
            >
              <div style={{ flex: 1 }}>
                <Space size={4} wrap>
                  <Tag color="green" style={{ fontSize: '12px' }}>
                    {material.code}
                  </Tag>
                  <Tag style={{ fontSize: '11px' }}>
                    {material.unit_short_name}
                  </Tag>
                </Space>
                <div
                  style={{
                    marginTop: 4,
                    color: '#333',
                    fontWeight: 500,
                  }}
                >
                  {material.name}
                </div>
                {material.category && (
                  <Text
                    type="secondary"
                    style={{ fontSize: '12px', display: 'block', marginTop: 4 }}
                  >
                    {material.category}
                  </Text>
                )}
                {material.supplier && (
                  <Text
                    type="secondary"
                    style={{ fontSize: '11px', display: 'block' }}
                  >
                    {material.supplier}
                  </Text>
                )}
              </div>
              <div style={{ textAlign: 'right', marginLeft: 16 }}>
                <div
                  style={{
                    fontSize: '18px',
                    fontWeight: 700,
                    color: '#52c41a',
                  }}
                >
                  {(material.last_purchase_price || 0).toLocaleString('ru-RU')}{' '}
                  ₽
                </div>
                <Text type="secondary" style={{ fontSize: '11px' }}>
                  за {material.unit_short_name}
                </Text>
              </div>
            </div>
          ),
          material,
        }))

      setOptions(mappedOptions)
    } else {
      setOptions([])
    }
  }, [searchValue, materials])

  const handleSearch = (value: string) => {
    setSearchValue(value)
    onChange?.(value)
  }

  const handleSelect = (value: string, option: MaterialOption) => {
    console.log('Выбран материал:', {
      id: option.material.id,
      name: option.material.name,
      code: option.material.code,
      price: option.material.last_purchase_price,
      unit: option.material.unit_short_name,
      timestamp: new Date().toISOString(),
    })

    onSelect(option.material)
    setSearchValue(option.material.name)
    onChange?.(option.material.name)
  }

  return (
    <AutoComplete
      value={searchValue}
      options={options}
      onSearch={handleSearch}
      onSelect={handleSelect}
      style={{ width: '100%' }}
      placeholder={placeholder}
      allowClear
      notFoundContent={
        searchValue.trim().length > 0 ? (
          <div style={{ padding: '12px', textAlign: 'center' }}>
            <Text type="secondary">Материалы не найдены</Text>
          </div>
        ) : (
          <div style={{ padding: '12px', textAlign: 'center' }}>
            <SearchOutlined style={{ fontSize: '24px', color: '#d9d9d9' }} />
            <div style={{ marginTop: 8 }}>
              <Text type="secondary">Начните вводить для поиска</Text>
            </div>
          </div>
        )
      }
      dropdownStyle={{
        maxHeight: 400,
        overflow: 'auto',
      }}
      popupMatchSelectWidth={600}
    />
  )
}
