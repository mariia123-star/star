import React, { useState } from 'react'
import { Upload, message, Card, Typography, Progress, Alert, Button, Space } from 'antd'
import { InboxOutlined, FileTextOutlined, LoadingOutlined } from '@ant-design/icons'
import { CSVParser } from '@/shared/lib/csvParser'
import { CSVParseResult } from '@/shared/types/estimate'

const { Dragger } = Upload
const { Title, Text } = Typography

interface FileUploadProps {
  onDataLoaded: (result: CSVParseResult) => void
  loading?: boolean
}

const FileUpload: React.FC<FileUploadProps> = ({ onDataLoaded, loading = false }) => {
  const [uploadProgress, setUploadProgress] = useState(0)
  const [parseResult, setParseResult] = useState<CSVParseResult | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)

  const handleFileUpload = async (file: globalThis.File) => {
    console.log('FileUpload: Начинаем загрузку файла', {
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
      timestamp: new Date().toISOString()
    })

    setIsProcessing(true)
    setUploadProgress(0)

    try {
      // Симуляция прогресса загрузки
      const progressInterval = globalThis.setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            globalThis.clearInterval(progressInterval)
            return 90
          }
          return prev + 10
        })
      }, 100)

      const result = await CSVParser.parseFile(file)

      globalThis.clearInterval(progressInterval)
      setUploadProgress(100)
      setParseResult(result)

      if (result.errors.length > 0) {
        message.warning(`Файл загружен с предупреждениями: ${result.errors.length} ошибок`)
      } else {
        message.success(`Файл успешно загружен: ${result.data.length} позиций`)
      }

      console.log('FileUpload: Файл обработан', {
        success: result.errors.length === 0,
        itemsCount: result.data.length,
        errorsCount: result.errors.length,
        skippedRows: result.skippedRows
      })

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Неизвестная ошибка'
      message.error(`Ошибка загрузки файла: ${errorMessage}`)
      console.error('FileUpload: Ошибка обработки файла', error)
      setParseResult(null)
    } finally {
      setIsProcessing(false)
      globalThis.setTimeout(() => setUploadProgress(0), 2000)
    }
  }

  const uploadProps = {
    name: 'file',
    multiple: false,
    accept: '.csv,.txt',
    beforeUpload: (file: globalThis.File) => {
      const isCSV = file.type === 'text/csv' || file.name.endsWith('.csv') || file.name.endsWith('.txt')
      if (!isCSV) {
        message.error('Можно загружать только CSV файлы!')
        return false
      }

      const isLt50M = file.size / 1024 / 1024 < 50
      if (!isLt50M) {
        message.error('Размер файла не должен превышать 50MB!')
        return false
      }

      handleFileUpload(file)
      return false // Предотвращаем автоматическую загрузку
    },
    disabled: loading || isProcessing
  }

  const handleConfirmLoad = () => {
    if (parseResult) {
      onDataLoaded(parseResult)
      setParseResult(null)
    }
  }

  const handleCancelLoad = () => {
    setParseResult(null)
  }

  return (
    <div>
      <Card>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <Title level={4}>
            <FileTextOutlined style={{ marginRight: 8 }} />
            Загрузка файла сметы
          </Title>
          <Text type="secondary">
            Поддерживаемые форматы: CSV с кодировкой Windows-1251
          </Text>
        </div>

        <Dragger {...uploadProps} style={{ marginBottom: 16 }}>
          <p className="ant-upload-drag-icon">
            {isProcessing ? <LoadingOutlined /> : <InboxOutlined />}
          </p>
          <p className="ant-upload-text">
            {isProcessing ? 'Обработка файла...' : 'Нажмите или перетащите файл в эту область'}
          </p>
          <p className="ant-upload-hint">
            Файл должен содержать колонки: № п/п, Заказчик, Тип материала, Наименование работ,
            Ед. изм., Объем, Коэф. расхода мат-лов, Цена работы, Цена материалов с НДС, Доставка, Итого
          </p>
        </Dragger>

        {uploadProgress > 0 && uploadProgress < 100 && (
          <Progress
            percent={uploadProgress}
            status={isProcessing ? 'active' : 'normal'}
            style={{ marginBottom: 16 }}
          />
        )}

        {parseResult && (
          <div style={{ marginTop: 16 }}>
            <Alert
              type={parseResult.errors.length > 0 ? 'warning' : 'success'}
              showIcon
              message="Предпросмотр результатов загрузки"
              description={
                <div>
                  <p><strong>Всего строк:</strong> {parseResult.totalRows}</p>
                  <p><strong>Загружено позиций:</strong> {parseResult.data.length}</p>
                  <p><strong>Пропущено строк:</strong> {parseResult.skippedRows}</p>
                  {parseResult.errors.length > 0 && (
                    <div>
                      <p><strong>Ошибки:</strong></p>
                      <ul style={{ margin: 0, paddingLeft: 20 }}>
                        {parseResult.errors.slice(0, 5).map((error, index) => (
                          <li key={index}>{error}</li>
                        ))}
                        {parseResult.errors.length > 5 && (
                          <li>... и еще {parseResult.errors.length - 5} ошибок</li>
                        )}
                      </ul>
                    </div>
                  )}
                </div>
              }
              style={{ marginBottom: 16 }}
            />

            <Space>
              <Button
                type="primary"
                onClick={handleConfirmLoad}
                disabled={parseResult.data.length === 0}
              >
                Загрузить данные
              </Button>
              <Button onClick={handleCancelLoad}>
                Отмена
              </Button>
            </Space>
          </div>
        )}
      </Card>
    </div>
  )
}

export default FileUpload