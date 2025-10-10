import React, { useState } from 'react'
import { Button, Card, Typography, Space, Table, Alert, Tag } from 'antd'
import { supabase } from '@/lib/supabase'

const { Title, Text, Paragraph } = Typography

interface DbRecord {
  id: string
  materials: string
  works: string
  record_type?: string
  material_type?: string
  coefficient?: number
  work_price?: number
  material_price?: number
  delivery_cost?: number
  created_at: string
}

function DatabaseDebug() {
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  const runDiagnostics = async () => {
    setLoading(true)
    setError(null)

    try {
      const diagnostics: any = {
        timestamp: new Date().toISOString(),
      }

      console.log('🔍 Запуск диагностики базы данных...')

      // 1. Общее количество записей
      console.log('1. Подсчет общего количества записей...')
      const { count: totalCount, error: countError } = await supabase
        .from('tender_estimates')
        .select('*', { count: 'exact', head: true })

      if (countError) {
        console.error('Ошибка подсчета:', countError)
        diagnostics.totalCountError = countError.message
      } else {
        diagnostics.totalCount = totalCount
        console.log(`Общее количество записей: ${totalCount}`)
      }

      // 2. Получение всех записей для анализа
      console.log('2. Получение записей для анализа...')
      const { data: allRecords, error: allError } = await supabase
        .from('tender_estimates')
        .select('*')
        .limit(1000)
        .order('created_at', { ascending: false })

      if (allError) {
        console.error('Ошибка получения записей:', allError)
        diagnostics.recordsError = allError.message
      } else {
        diagnostics.recordsCount = allRecords?.length || 0
        console.log(`Получено записей для анализа: ${allRecords?.length || 0}`)

        // Анализ полей
        if (allRecords && allRecords.length > 0) {
          const sampleRecord = allRecords[0]
          diagnostics.availableFields = Object.keys(sampleRecord)
          console.log('Доступные поля:', diagnostics.availableFields)

          // Группировка по record_type
          const groupedByType: Record<string, number> = {}
          allRecords.forEach(record => {
            const type = record.record_type || 'NULL'
            groupedByType[type] = (groupedByType[type] || 0) + 1
          })
          diagnostics.groupedByRecordType = groupedByType
          console.log('Группировка по record_type:', groupedByType)

          // Анализ заполненности новых полей
          const fieldAnalysis: Record<
            string,
            { filled: number; empty: number }
          > = {}
          const newFields = [
            'record_type',
            'material_type',
            'coefficient',
            'work_price',
            'material_price',
            'delivery_cost',
          ]

          newFields.forEach(field => {
            fieldAnalysis[field] = {
              filled: 0,
              empty: 0,
            }

            allRecords.forEach(record => {
              const value = (record as any)[field]
              if (value !== null && value !== undefined && value !== '') {
                fieldAnalysis[field].filled++
              } else {
                fieldAnalysis[field].empty++
              }
            })
          })

          diagnostics.fieldAnalysis = fieldAnalysis
          console.log('Анализ заполненности полей:', fieldAnalysis)

          // Последние записи
          diagnostics.recentRecords = allRecords.slice(0, 10).map(record => ({
            id: record.id,
            materials: record.materials || '',
            works: record.works || '',
            record_type: record.record_type || null,
            material_type: record.material_type || null,
            coefficient: record.coefficient || null,
            work_price: record.work_price || null,
            material_price: record.material_price || null,
            delivery_cost: record.delivery_cost || null,
            created_at: record.created_at,
          }))
        }
      }

      // 3. Проверка структуры через описание таблицы
      console.log('3. Проверка структуры таблицы...')
      try {
        const { data: columnsData, error: columnsError } = await supabase
          .from('information_schema.columns')
          .select('column_name, data_type, is_nullable, column_default')
          .eq('table_name', 'tender_estimates')
          .eq('table_schema', 'public')

        if (columnsError) {
          console.log(
            'Ошибка получения схемы через information_schema:',
            columnsError
          )
          diagnostics.schemaError = columnsError.message
        } else {
          diagnostics.tableSchema = columnsData
          console.log('Схема таблицы:', columnsData)
        }
      } catch (schemaError) {
        console.log('Не удалось получить схему таблицы:', schemaError)
        diagnostics.schemaError = 'Доступ к information_schema ограничен'
      }

      setResults(diagnostics)
      console.log('✅ Диагностика завершена:', diagnostics)
    } catch (err) {
      console.error('❌ Ошибка при выполнении диагностики:', err)
      setError(err instanceof Error ? err.message : 'Неизвестная ошибка')
    } finally {
      setLoading(false)
    }
  }

  const columns = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 100,
      render: (text: string) => text.slice(-8),
    },
    {
      title: 'Материалы',
      dataIndex: 'materials',
      key: 'materials',
      width: 150,
      render: (text: string) => text || '—',
    },
    {
      title: 'Работы',
      dataIndex: 'works',
      key: 'works',
      width: 150,
      render: (text: string) => text || '—',
    },
    {
      title: 'Тип записи',
      dataIndex: 'record_type',
      key: 'record_type',
      width: 100,
      render: (text: string) =>
        text ? <Tag color="blue">{text}</Tag> : <Tag>NULL</Tag>,
    },
    {
      title: 'Тип материала',
      dataIndex: 'material_type',
      key: 'material_type',
      width: 120,
      render: (text: string) => text || '—',
    },
    {
      title: 'Коэффициент',
      dataIndex: 'coefficient',
      key: 'coefficient',
      width: 100,
      render: (num: number) =>
        num !== null && num !== undefined ? num.toString() : '—',
    },
    {
      title: 'Цена работы',
      dataIndex: 'work_price',
      key: 'work_price',
      width: 100,
      render: (num: number) =>
        num !== null && num !== undefined ? `${num}₽` : '—',
    },
    {
      title: 'Создано',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 150,
      render: (text: string) => new Date(text).toLocaleString('ru-RU'),
    },
  ]

  return (
    <div style={{ padding: 24 }}>
      <Title level={2}>Диагностика базы данных tender_estimates</Title>
      <Paragraph>
        Эта страница позволяет проанализировать структуру и содержимое таблицы
        tender_estimates для выявления проблем с полями record_type и другими
        новыми полями.
      </Paragraph>

      <Space style={{ marginBottom: 24 }}>
        <Button
          type="primary"
          onClick={runDiagnostics}
          loading={loading}
          size="large"
        >
          Запустить диагностику
        </Button>
      </Space>

      {error && (
        <Alert
          message="Ошибка диагностики"
          description={error}
          type="error"
          closable
          style={{ marginBottom: 24 }}
        />
      )}

      {results && (
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          {/* Общая статистика */}
          <Card title="Общая статистика" size="small">
            <div>
              <Text strong>Время диагностики:</Text>{' '}
              {new Date(results.timestamp).toLocaleString('ru-RU')}
            </div>
            <div>
              <Text strong>Общее количество записей:</Text>{' '}
              {results.totalCount ?? 'Ошибка подсчета'}
            </div>
            <div>
              <Text strong>Записей получено для анализа:</Text>{' '}
              {results.recordsCount ?? 0}
            </div>
            {results.totalCountError && (
              <Alert
                message={`Ошибка подсчета: ${results.totalCountError}`}
                type="warning"
                size="small"
              />
            )}
            {results.recordsError && (
              <Alert
                message={`Ошибка получения записей: ${results.recordsError}`}
                type="error"
                size="small"
              />
            )}
          </Card>

          {/* Структура таблицы */}
          {results.availableFields && (
            <Card title="Доступные поля в таблице" size="small">
              <Space wrap>
                {results.availableFields.map((field: string) => (
                  <Tag
                    key={field}
                    color={
                      [
                        'record_type',
                        'material_type',
                        'coefficient',
                        'work_price',
                        'material_price',
                        'delivery_cost',
                      ].includes(field)
                        ? 'green'
                        : 'default'
                    }
                  >
                    {field}
                  </Tag>
                ))}
              </Space>
            </Card>
          )}

          {/* Схема таблицы */}
          {results.tableSchema && (
            <Card title="Схема таблицы (information_schema)" size="small">
              <Table
                dataSource={results.tableSchema}
                size="small"
                rowKey="column_name"
                pagination={false}
                columns={[
                  {
                    title: 'Поле',
                    dataIndex: 'column_name',
                    key: 'column_name',
                  },
                  {
                    title: 'Тип данных',
                    dataIndex: 'data_type',
                    key: 'data_type',
                  },
                  {
                    title: 'Nullable',
                    dataIndex: 'is_nullable',
                    key: 'is_nullable',
                  },
                  {
                    title: 'По умолчанию',
                    dataIndex: 'column_default',
                    key: 'column_default',
                  },
                ]}
              />
            </Card>
          )}

          {/* Группировка по record_type */}
          {results.groupedByRecordType && (
            <Card title="Группировка по типу записи (record_type)" size="small">
              <Space wrap>
                {Object.entries(results.groupedByRecordType).map(
                  ([type, count]) => (
                    <div
                      key={type}
                      style={{
                        padding: '8px 12px',
                        border: '1px solid #d9d9d9',
                        borderRadius: 4,
                        background: type === 'NULL' ? '#fff2f0' : '#f6ffed',
                      }}
                    >
                      <Text strong>{type}:</Text> {count as number}
                    </div>
                  )
                )}
              </Space>
            </Card>
          )}

          {/* Анализ заполненности полей */}
          {results.fieldAnalysis && (
            <Card title="Анализ заполненности новых полей" size="small">
              <Table
                dataSource={Object.entries(results.fieldAnalysis).map(
                  ([field, stats]) => ({
                    field,
                    filled: (stats as any).filled,
                    empty: (stats as any).empty,
                    total: (stats as any).filled + (stats as any).empty,
                    fillRate: (
                      ((stats as any).filled /
                        ((stats as any).filled + (stats as any).empty)) *
                      100
                    ).toFixed(1),
                  })
                )}
                size="small"
                rowKey="field"
                pagination={false}
                columns={[
                  { title: 'Поле', dataIndex: 'field', key: 'field' },
                  { title: 'Заполнено', dataIndex: 'filled', key: 'filled' },
                  { title: 'Пусто', dataIndex: 'empty', key: 'empty' },
                  { title: 'Всего', dataIndex: 'total', key: 'total' },
                  {
                    title: 'Заполненность, %',
                    dataIndex: 'fillRate',
                    key: 'fillRate',
                    render: (rate: string) => (
                      <Tag color={parseFloat(rate) > 0 ? 'green' : 'red'}>
                        {rate}%
                      </Tag>
                    ),
                  },
                ]}
              />
            </Card>
          )}

          {/* Последние записи */}
          {results.recentRecords && (
            <Card title="Последние 10 записей" size="small">
              <Table
                dataSource={results.recentRecords}
                columns={columns}
                size="small"
                rowKey="id"
                pagination={false}
                scroll={{ x: 'max-content' }}
              />
            </Card>
          )}
        </Space>
      )}
    </div>
  )
}

export default DatabaseDebug
