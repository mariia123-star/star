import React, { useState } from 'react'
import {
  Card,
  Typography,
  Button,
  Space,
  Radio,
  Input,
  Checkbox,
  Modal,
  Form,
  message,
  Divider
} from 'antd'
import {
  ExportOutlined,
  FileExcelOutlined,
  FilePdfOutlined,
  FileTextOutlined,
  DownloadOutlined
} from '@ant-design/icons'
import { EstimateItem, EstimateCalculations, EstimateExportOptions } from '@/shared/types/estimate'
import { ExportUtils } from '@/shared/lib/exportUtils'

const { Title } = Typography
const { TextArea } = Input

interface ExportControlsProps {
  items: EstimateItem[]
  calculations: EstimateCalculations
  loading?: boolean
}

const ExportControls: React.FC<ExportControlsProps> = ({
  items,
  calculations,
  loading = false
}) => {
  const [isModalVisible, setIsModalVisible] = useState(false)
  const [exportLoading, setExportLoading] = useState(false)
  const [form] = Form.useForm()

  const showExportModal = () => {
    console.log('ExportControls: Открываем модал экспорта', {
      itemsCount: items.length,
      timestamp: new Date().toISOString()
    })

    setIsModalVisible(true)
    form.setFieldsValue({
      format: 'excel',
      includeCalculations: true,
      includeFilters: false,
      includeModifications: false,
      title: `Тендерная смета от ${new Date().toLocaleDateString('ru-RU')}`,
      description: 'Автоматически сгенерированная смета'
    })
  }

  const handleExport = async () => {
    try {
      const values = await form.validateFields()
      const options: EstimateExportOptions = {
        format: values.format,
        includeCalculations: values.includeCalculations,
        includeFilters: values.includeFilters,
        includeModifications: values.includeModifications,
        title: values.title,
        description: values.description
      }

      console.log('ExportControls: Начинаем экспорт', {
        format: options.format,
        options,
        timestamp: new Date().toISOString()
      })

      setExportLoading(true)

      if (options.format === 'excel') {
        await ExportUtils.exportToExcel(items, calculations, options)
        message.success('Файл Excel успешно экспортирован')
      } else if (options.format === 'pdf') {
        await ExportUtils.exportToPDF(items, calculations, options)
        message.success('Файл PDF успешно экспортирован')
      }

      setIsModalVisible(false)

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Неизвестная ошибка'
      message.error(`Ошибка экспорта: ${errorMessage}`)
      console.error('ExportControls: Ошибка экспорта', error)
    } finally {
      setExportLoading(false)
    }
  }

  const handleQuickExport = (format: 'excel' | 'pdf') => {
    const options: EstimateExportOptions = {
      format,
      includeCalculations: true,
      includeFilters: false,
      includeModifications: false,
      title: `Тендерная смета от ${new Date().toLocaleDateString('ru-RU')}`
    }

    console.log('ExportControls: Быстрый экспорт', {
      format,
      timestamp: new Date().toISOString()
    })

    if (format === 'excel') {
      ExportUtils.exportToExcel(items, calculations, options)
        .then(() => message.success('Файл Excel успешно экспортирован'))
        .catch(() => message.error('Ошибка экспорта в Excel'))
    } else {
      ExportUtils.exportToPDF(items, calculations, options)
        .then(() => message.success('Файл PDF успешно экспортирован'))
        .catch(() => message.error('Ошибка экспорта в PDF'))
    }
  }

  const handleCSVExport = () => {
    const options: EstimateExportOptions = {
      format: 'excel', // Не используется для CSV
      includeCalculations: false,
      includeFilters: false,
      includeModifications: false,
      title: `smeta_${new Date().toISOString().split('T')[0]}`
    }

    console.log('ExportControls: Экспорт в CSV', {
      timestamp: new Date().toISOString()
    })

    try {
      ExportUtils.exportToCSV(items, options)
      message.success('Файл CSV успешно экспортирован')
    } catch (_error) {
      message.error('Ошибка экспорта в CSV')
    }
  }

  const isDataAvailable = items.length > 0

  return (
    <>
      <Card
        title={
          <Space>
            <ExportOutlined />
            <span>Экспорт данных</span>
          </Space>
        }
        size="small"
      >
        <Space direction="vertical" style={{ width: '100%' }}>
          <div>
            <Title level={5}>Быстрый экспорт</Title>
            <Space wrap>
              <Button
                type="primary"
                icon={<FileExcelOutlined />}
                onClick={() => handleQuickExport('excel')}
                disabled={!isDataAvailable || loading}
              >
                Excel
              </Button>
              <Button
                icon={<FilePdfOutlined />}
                onClick={() => handleQuickExport('pdf')}
                disabled={!isDataAvailable || loading}
              >
                PDF
              </Button>
              <Button
                icon={<FileTextOutlined />}
                onClick={handleCSVExport}
                disabled={!isDataAvailable || loading}
              >
                CSV
              </Button>
            </Space>
          </div>

          <Divider />

          <div>
            <Title level={5}>Настройки экспорта</Title>
            <Button
              icon={<DownloadOutlined />}
              onClick={showExportModal}
              disabled={!isDataAvailable || loading}
              block
            >
              Экспорт с настройками
            </Button>
          </div>

          {!isDataAvailable && (
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <Typography.Text type="secondary">
                Загрузите данные сметы для экспорта
              </Typography.Text>
            </div>
          )}
        </Space>
      </Card>

      <Modal
        title="Настройки экспорта"
        open={isModalVisible}
        onOk={handleExport}
        onCancel={() => setIsModalVisible(false)}
        confirmLoading={exportLoading}
        width={600}
        okText="Экспортировать"
        cancelText="Отмена"
      >
        <Form
          form={form}
          layout="vertical"
          style={{ marginTop: 16 }}
        >
          <Form.Item
            name="format"
            label="Формат файла"
            rules={[{ required: true, message: 'Выберите формат файла' }]}
          >
            <Radio.Group>
              <Radio.Button value="excel">
                <FileExcelOutlined style={{ marginRight: 8 }} />
                Excel
              </Radio.Button>
              <Radio.Button value="pdf">
                <FilePdfOutlined style={{ marginRight: 8 }} />
                PDF
              </Radio.Button>
            </Radio.Group>
          </Form.Item>

          <Form.Item
            name="title"
            label="Название документа"
            rules={[{ required: true, message: 'Введите название документа' }]}
          >
            <Input placeholder="Введите название документа" />
          </Form.Item>

          <Form.Item
            name="description"
            label="Описание"
          >
            <TextArea
              rows={3}
              placeholder="Дополнительное описание документа (опционально)"
            />
          </Form.Item>

          <Form.Item label="Дополнительные данные">
            <Space direction="vertical">
              <Form.Item
                name="includeCalculations"
                valuePropName="checked"
                style={{ marginBottom: 8 }}
              >
                <Checkbox>Включить итоговые расчеты</Checkbox>
              </Form.Item>

              <Form.Item
                name="includeFilters"
                valuePropName="checked"
                style={{ marginBottom: 8 }}
              >
                <Checkbox>Включить примененные фильтры</Checkbox>
              </Form.Item>

              <Form.Item
                name="includeModifications"
                valuePropName="checked"
                style={{ marginBottom: 0 }}
              >
                <Checkbox>Включить историю изменений</Checkbox>
              </Form.Item>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </>
  )
}

export default ExportControls