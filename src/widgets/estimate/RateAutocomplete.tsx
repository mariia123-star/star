import React, { useState, useEffect, useRef } from 'react'
import { AutoComplete, Input, Space, Tag, Typography } from 'antd'
import { SearchOutlined } from '@ant-design/icons'
import type { RateWithUnit } from '@/entities/rates'
import type { RefSelectProps } from 'antd'

const { Text } = Typography

interface RateAutocompleteProps {
  rates: RateWithUnit[]
  onSelect: (rate: RateWithUnit) => void
  placeholder?: string
}

interface RateOption {
  value: string
  label: React.ReactNode
  rate: RateWithUnit
}

export const RateAutocomplete: React.FC<RateAutocompleteProps> = ({
  rates,
  onSelect,
  placeholder = 'Начните вводить: кладка, штукатурка, малярные работы...',
}) => {
  const [searchValue, setSearchValue] = useState('')
  const [options, setOptions] = useState<RateOption[]>([])
  const inputRef = useRef<RefSelectProps>(null)

  // Фильтрация расценок по поисковому запросу
  useEffect(() => {
    if (searchValue.trim().length > 0) {
      const filtered = rates.filter(
        rate =>
          rate.name.toLowerCase().includes(searchValue.toLowerCase()) ||
          rate.code.toLowerCase().includes(searchValue.toLowerCase())
      )

      const mappedOptions: RateOption[] = filtered.map(rate => ({
        value: rate.id,
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
                <Tag color="blue" style={{ fontSize: '12px' }}>
                  {rate.code}
                </Tag>
                <Tag style={{ fontSize: '11px' }}>{rate.unit_short_name}</Tag>
              </Space>
              <div
                style={{
                  marginTop: 4,
                  color: '#333',
                  fontWeight: 500,
                }}
              >
                {rate.name}
              </div>
              {rate.category && (
                <Text
                  type="secondary"
                  style={{ fontSize: '12px', display: 'block', marginTop: 4 }}
                >
                  {rate.category}
                  {rate.subcategory && ` / ${rate.subcategory}`}
                </Text>
              )}
            </div>
            <div style={{ textAlign: 'right', marginLeft: 16 }}>
              <div
                style={{
                  fontSize: '18px',
                  fontWeight: 700,
                  color: '#1890ff',
                }}
              >
                {rate.base_price.toLocaleString('ru-RU')} ₽
              </div>
              <Text type="secondary" style={{ fontSize: '11px' }}>
                за {rate.unit_short_name}
              </Text>
            </div>
          </div>
        ),
        rate,
      }))

      setOptions(mappedOptions)
    } else {
      setOptions([])
    }
  }, [searchValue, rates])

  // Обработка выбора расценки
  const handleSelect = (value: string) => {
    const selected = options.find(opt => opt.value === value)
    if (selected) {
      console.log('🔍 Rate selected:', {
        id: selected.rate.id,
        code: selected.rate.code,
        name: selected.rate.name,
        price: selected.rate.base_price,
        timestamp: new Date().toISOString(),
      })

      onSelect(selected.rate)
      setSearchValue('')
      setOptions([])

      // Возвращаем фокус на поле ввода
      window.setTimeout(() => {
        inputRef.current?.focus()
      }, 0)
    }
  }

  const handleSearch = (value: string) => {
    console.log('🔍 Search query:', {
      query: value,
      timestamp: new Date().toISOString(),
    })
    setSearchValue(value)
  }

  return (
    <AutoComplete
      ref={inputRef}
      value={searchValue}
      options={options}
      onSelect={handleSelect}
      onSearch={handleSearch}
      style={{ width: '100%' }}
      notFoundContent={
        searchValue ? (
          <div style={{ padding: '32px', textAlign: 'center' }}>
            <div style={{ fontSize: '32px', marginBottom: 8 }}>🔍</div>
            <Text type="secondary">
              Расценки не найдены по запросу "<Text strong>{searchValue}</Text>"
            </Text>
            <div style={{ marginTop: 8 }}>
              <Text type="secondary" style={{ fontSize: '12px' }}>
                Попробуйте изменить поисковый запрос
              </Text>
            </div>
          </div>
        ) : null
      }
      filterOption={false} // Отключаем встроенную фильтрацию, используем свою
    >
      <Input
        size="large"
        placeholder={placeholder}
        prefix={<SearchOutlined style={{ color: '#bfbfbf' }} />}
        allowClear
      />
    </AutoComplete>
  )
}
