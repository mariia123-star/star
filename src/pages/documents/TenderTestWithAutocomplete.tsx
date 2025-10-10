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
import { RateAutocomplete } from '@/widgets/estimate'
import { useQuery } from '@tanstack/react-query'
import { ratesApi } from '@/entities/rates'
import { projectsApi } from '@/entities/projects'
import { supabase } from '@/lib/supabase'
import { useMaterialTypes } from '@/shared/hooks/useMaterialTypes'
import {
  getMaterialTypeByShortName,
  type MaterialType,
} from '@/entities/material-types'

const { Option } = Select

// Тестовая версия страницы с RateAutocomplete
export default function TenderTestWithAutocomplete() {
  const { message } = App.useApp()
  const [selectedRateId, setSelectedRateId] = useState<string | null>(null)

  // Загружаем расценки
  const { data: rates = [], isLoading: ratesLoading } = useQuery({
    queryKey: ['rates'],
    queryFn: ratesApi.getAll,
  })

  return (
    <div style={{ padding: 24 }}>
      <h1>Тестовая страница RateAutocomplete</h1>

      <Card title="Поиск расценки" style={{ marginTop: 16 }}>
        <RateAutocomplete
          rates={rates}
          onSelect={rate => {
            setSelectedRateId(rate.id)
            message.success(`Выбрана расценка: ${rate.code} - ${rate.name}`)
            console.log('📋 Rate selected:', {
              id: rate.id,
              code: rate.code,
              name: rate.name,
              price: rate.base_price,
              timestamp: new Date().toISOString(),
            })
          }}
        />

        {selectedRateId && (
          <div
            style={{
              marginTop: 16,
              padding: 16,
              background: '#f0f7ff',
              borderRadius: 8,
            }}
          >
            <div style={{ fontWeight: 600, marginBottom: 8 }}>
              Выбранная расценка:
            </div>
            <div>ID: {selectedRateId}</div>
            <div>
              Данные:{' '}
              {JSON.stringify(
                rates.find(r => r.id === selectedRateId),
                null,
                2
              )}
            </div>
          </div>
        )}
      </Card>
    </div>
  )
}
