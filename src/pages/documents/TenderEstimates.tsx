import { useState, useEffect } from 'react'
import { Table, Button, Space, Tag, Popconfirm, message } from 'antd'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import {
  DeleteOutlined,
  EditOutlined,
  FileTextOutlined,
  LockOutlined,
  TeamOutlined,
  GlobalOutlined,
} from '@ant-design/icons'
import { supabase } from '@/lib/supabase'
import type { ColumnsType } from 'antd/es/table'

interface EstimateDraft {
  id: string
  project_id: string
  name: string
  status: 'draft' | 'final'
  data: {
    positions?: any[]
    rows?: any[]
    totalCost?: number
    totals?: {
      grandTotal?: number
      totalMaterials?: number
      totalWorks?: number
      totalDelivery?: number
    }
    coefficients?: any
    createdAt?: string
  }
  created_at: string
  updated_at: string
  created_by?: string
  access_level?: 'private' | 'team' | 'public'
  total_amount?: number
  project?: {
    name: string
  }
  user?: {
    full_name: string
  }
}

const TenderEstimates = () => {
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  // Загружаем всех пользователей
  const { data: users = [] } = useQuery({
    queryKey: ['users', 'all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('users')
        .select('id, full_name')
        .eq('is_active', true)

      if (error) {
        console.error('❌ Error loading users:', error)
        return []
      }

      return data || []
    },
  })

  // Загружаем все сметы со статусом 'final'
  const {
    data: rawEstimates = [],
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ['estimates', 'final'],
    queryFn: async () => {
      console.log('📋 Loading final estimates from database...')

      const { data, error } = await supabase
        .from('estimate_drafts')
        .select(
          `
          *,
          project:projects(name)
        `
        )
        .eq('status', 'final')
        .order('created_at', { ascending: false })

      if (error) {
        console.error('❌ Error loading estimates:', error)
        throw error
      }

      console.log('✅ Loaded estimates:', data?.length || 0)
      return data as EstimateDraft[]
    },
    refetchInterval: 30000, // Автообновление каждые 30 секунд
  })

  // Объединяем сметы с данными пользователей
  const estimates = rawEstimates.map(estimate => {
    const user = users.find(u => u.id === estimate.created_by)
    return {
      ...estimate,
      user: user ? { full_name: user.full_name } : undefined,
    }
  })

  // Удаление сметы
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('estimate_drafts')
        .delete()
        .eq('id', id)

      if (error) throw error
    },
    onSuccess: () => {
      message.success('Смета успешно удалена')
      queryClient.invalidateQueries({ queryKey: ['estimates', 'final'] })
    },
    onError: (error: any) => {
      console.error('Delete estimate error:', error)
      message.error('Ошибка при удалении сметы')
    },
  })

  const columns: ColumnsType<EstimateDraft> = [
    {
      title: '№',
      key: 'index',
      width: 60,
      render: (_: any, __: any, index: number) => index + 1,
    },
    {
      title: 'Название сметы',
      dataIndex: 'name',
      key: 'name',
      sorter: (a, b) => a.name.localeCompare(b.name),
    },
    {
      title: 'Проект',
      key: 'project',
      render: (record: EstimateDraft) => record.project?.name || '—',
      sorter: (a, b) =>
        (a.project?.name || '').localeCompare(b.project?.name || ''),
    },
    {
      title: 'Автор',
      key: 'author',
      width: 150,
      render: (record: EstimateDraft) => record.user?.full_name || '—',
      sorter: (a, b) =>
        (a.user?.full_name || '').localeCompare(b.user?.full_name || ''),
    },
    {
      title: 'Права доступа',
      key: 'access_level',
      width: 140,
      render: (record: EstimateDraft) => {
        const accessLevel = record.access_level || 'private'
        const accessConfig = {
          private: { color: 'red', icon: <LockOutlined />, text: 'Личная' },
          team: { color: 'blue', icon: <TeamOutlined />, text: 'Команда' },
          public: { color: 'green', icon: <GlobalOutlined />, text: 'Общая' },
        }
        const config = accessConfig[accessLevel]
        return (
          <Tag color={config.color} icon={config.icon}>
            {config.text}
          </Tag>
        )
      },
      sorter: (a, b) =>
        (a.access_level || 'private').localeCompare(
          b.access_level || 'private'
        ),
    },
    {
      title: 'Позиций',
      key: 'positions',
      width: 100,
      render: (record: EstimateDraft) =>
        record.data?.rows?.length || record.data?.positions?.length || 0,
    },
    {
      title: 'Сумма',
      key: 'totalCost',
      width: 150,
      render: (record: EstimateDraft) => {
        // Пробуем получить сумму из разных источников
        const total =
          record.total_amount ||
          record.data?.totals?.grandTotal ||
          record.data?.totalCost ||
          0

        console.log('💰 Отображение суммы сметы', {
          estimateId: record.id,
          estimateName: record.name,
          total_amount: record.total_amount,
          grandTotal: record.data?.totals?.grandTotal,
          totalCost: record.data?.totalCost,
          selectedTotal: total,
          timestamp: new Date().toISOString(),
        })

        return new Intl.NumberFormat('ru-RU', {
          style: 'currency',
          currency: 'RUB',
        }).format(total)
      },
      sorter: (a, b) => {
        const aTotal =
          a.total_amount || a.data?.totals?.grandTotal || a.data?.totalCost || 0
        const bTotal =
          b.total_amount || b.data?.totals?.grandTotal || b.data?.totalCost || 0
        return aTotal - bTotal
      },
    },
    {
      title: 'Дата создания',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 180,
      render: (date: string) =>
        new Date(date).toLocaleString('ru-RU', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
        }),
      sorter: (a, b) =>
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
    },
    {
      title: 'Действия',
      key: 'actions',
      width: 120,
      fixed: 'right',
      render: (record: EstimateDraft) => (
        <Space size="small">
          <Button
            type="link"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
            title="Редактировать"
          />
          <Popconfirm
            title="Удалить смету?"
            description="Это действие нельзя отменить"
            onConfirm={() => deleteMutation.mutate(record.id)}
            okText="Удалить"
            cancelText="Отмена"
            okButtonProps={{ danger: true }}
          >
            <Button
              type="link"
              danger
              icon={<DeleteOutlined />}
              title="Удалить"
            />
          </Popconfirm>
        </Space>
      ),
    },
  ]

  const handleEdit = (estimate: EstimateDraft) => {
    console.log('📝 Opening estimate for editing:', {
      id: estimate.id,
      name: estimate.name,
      positionsCount: estimate.data?.rows?.length || 0,
    })
    // Переходим на страницу калькулятора смет с ID сметы
    navigate(`/documents/calculator?estimateId=${estimate.id}`)
  }

  return (
    <div
      style={{
        height: 'calc(100vh - 96px)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      {/* Заголовок страницы */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 16,
          flexShrink: 0,
        }}
      >
        <h2
          style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}
        >
          <FileTextOutlined />
          Сохраненные сметы
        </h2>
        <Button
          type="primary"
          onClick={() => navigate('/documents/calculator')}
        >
          Создать новую смету
        </Button>
      </div>

      {/* Таблица */}
      <div style={{ flex: 1, overflow: 'hidden', minHeight: 0 }}>
        <Table
          columns={columns}
          dataSource={estimates}
          loading={isLoading}
          rowKey="id"
          pagination={{
            pageSize: 20,
            showSizeChanger: true,
            showTotal: total => `Всего смет: ${total}`,
          }}
          scroll={{ y: 'calc(100vh - 300px)' }}
          sticky
        />
      </div>
    </div>
  )
}

export default TenderEstimates
