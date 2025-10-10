import React from 'react'
import { Card, InputNumber, Row, Col, Button, Space, Typography } from 'antd'
import { ReloadOutlined, SaveOutlined } from '@ant-design/icons'
import type { EstimateCoefficients } from '@/shared/lib/estimateCoefficients'
import {
  COEFFICIENT_LABELS,
  resetCoefficients,
  saveCoefficients,
} from '@/shared/lib/estimateCoefficients'

const { Title, Text } = Typography

interface CoefficientsPanelProps {
  coefficients: EstimateCoefficients
  onChange: (coefficients: EstimateCoefficients) => void
}

export const CoefficientsPanel: React.FC<CoefficientsPanelProps> = ({
  coefficients,
  onChange,
}) => {
  const handleCoefficientChange = (
    key: keyof EstimateCoefficients,
    value: number | null
  ) => {
    if (value !== null) {
      const updated = { ...coefficients, [key]: value }
      onChange(updated)
      console.log(`📊 Коэффициент ${key} изменен:`, value)
    }
  }

  const handleReset = () => {
    const defaultCoeffs = resetCoefficients()
    onChange(defaultCoeffs)
    console.log('🔄 Коэффициенты сброшены к значениям по умолчанию')
  }

  const handleSave = () => {
    saveCoefficients(coefficients)
    console.log('💾 Коэффициенты сохранены')
  }

  return (
    <Card
      title={
        <Space>
          <Title level={5} style={{ margin: 0 }}>
            Коэффициенты расчёта
          </Title>
        </Space>
      }
      extra={
        <Space>
          <Button
            icon={<SaveOutlined />}
            onClick={handleSave}
            type="primary"
            size="small"
          >
            Сохранить
          </Button>
          <Button icon={<ReloadOutlined />} onClick={handleReset} size="small">
            Сбросить
          </Button>
        </Space>
      }
      style={{ marginBottom: 16 }}
      styles={{ body: { padding: '16px' } }}
    >
      <Row gutter={[12, 12]}>
        {(Object.keys(coefficients) as Array<keyof EstimateCoefficients>).map(
          key => (
            <Col xs={12} sm={8} md={6} lg={4} key={key}>
              <Space direction="vertical" size={4} style={{ width: '100%' }}>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  {COEFFICIENT_LABELS[key]}
                </Text>
                <InputNumber
                  value={coefficients[key]}
                  onChange={value => handleCoefficientChange(key, value)}
                  min={0}
                  max={10}
                  step={0.01}
                  precision={2}
                  style={{ width: '100%' }}
                  size="small"
                />
              </Space>
            </Col>
          )
        )}
      </Row>
    </Card>
  )
}
