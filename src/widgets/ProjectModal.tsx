import {
  Modal,
  Form,
  Input,
  Select,
  DatePicker,
  InputNumber,
  message,
} from 'antd'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  projectsApi,
  Project,
} from '../shared/api/projects'
import dayjs from 'dayjs'

interface ProjectModalProps {
  visible: boolean
  onClose: () => void
  project?: Project
}

const { Option } = Select
const { TextArea } = Input

const ProjectModal = ({ visible, onClose, project }: ProjectModalProps) => {
  const [form] = Form.useForm()
  const queryClient = useQueryClient()

  const createMutation = useMutation({
    mutationFn: projectsApi.create,
    onSuccess: () => {
      message.success('Проект успешно создан')
      queryClient.invalidateQueries({ queryKey: ['projects'] })
      onClose()
      form.resetFields()
    },
    onError: (error: any) => {
      console.error('Project creation error:', error)
      message.error(
        `Ошибка при создании проекта: ${error.message || 'Неизвестная ошибка'}`
      )
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, ...data }: { id: string } & UpdateProjectData) =>
      projectsApi.update(id, data),
    onSuccess: () => {
      message.success('Проект успешно обновлен')
      queryClient.invalidateQueries({ queryKey: ['projects'] })
      onClose()
      form.resetFields()
    },
    onError: (error: any) => {
      console.error('Project update error:', error)
      message.error(
        `Ошибка при обновлении проекта: ${error.message || 'Неизвестная ошибка'}`
      )
    },
  })

  const handleSubmit = async (values: any) => {
    const data = {
      ...values,
      start_date: values.start_date
        ? values.start_date.format('YYYY-MM-DD')
        : null,
      end_date: values.end_date ? values.end_date.format('YYYY-MM-DD') : null,
    }

    if (project) {
      updateMutation.mutate({ id: project.id, ...data })
    } else {
      createMutation.mutate(data)
    }
  }

  const handleCancel = () => {
    onClose()
    form.resetFields()
  }

  return (
    <Modal
      title={project ? 'Редактировать проект' : 'Добавить проект'}
      open={visible}
      onOk={() => form.submit()}
      onCancel={handleCancel}
      confirmLoading={createMutation.isPending || updateMutation.isPending}
      width={600}
      okText={project ? 'Обновить' : 'Создать'}
      cancelText="Отмена"
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        initialValues={
          project
            ? {
                name: project.name,
                description: project.description,
                start_date: project.start_date
                  ? dayjs(project.start_date)
                  : null,
                end_date: project.end_date ? dayjs(project.end_date) : null,
                status: project.status,
                budget: project.budget,
                responsible_person: project.responsible_person,
              }
            : {
                status: 'планируется',
                budget: 0,
              }
        }
      >
        <Form.Item
          name="name"
          label="Название проекта"
          rules={[
            { required: true, message: 'Введите название проекта' },
            { min: 2, message: 'Название должно содержать минимум 2 символа' },
            { max: 300, message: 'Название не должно превышать 300 символов' },
          ]}
        >
          <Input placeholder="Реконструкция офисного здания" />
        </Form.Item>

        <Form.Item name="description" label="Описание">
          <TextArea placeholder="Описание проекта" rows={3} />
        </Form.Item>

        <div style={{ display: 'flex', gap: '16px' }}>
          <Form.Item name="start_date" label="Дата начала" style={{ flex: 1 }}>
            <DatePicker
              placeholder="Выберите дату"
              style={{ width: '100%' }}
              format="DD.MM.YYYY"
            />
          </Form.Item>

          <Form.Item name="end_date" label="Дата окончания" style={{ flex: 1 }}>
            <DatePicker
              placeholder="Выберите дату"
              style={{ width: '100%' }}
              format="DD.MM.YYYY"
            />
          </Form.Item>
        </div>

        <div style={{ display: 'flex', gap: '16px' }}>
          <Form.Item
            name="status"
            label="Статус"
            rules={[{ required: true, message: 'Выберите статус проекта' }]}
            style={{ flex: 1 }}
          >
            <Select placeholder="Выберите статус">
              <Option value="планируется">Планируется</Option>
              <Option value="в_работе">В работе</Option>
              <Option value="завершен">Завершен</Option>
              <Option value="приостановлен">Приостановлен</Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="budget"
            label="Бюджет"
            rules={[
              {
                type: 'number',
                min: 0,
                message: 'Бюджет не может быть отрицательным',
              },
            ]}
            style={{ flex: 1 }}
          >
            <InputNumber
              placeholder="0"
              style={{ width: '100%' }}
              precision={2}
              min={0}
              addonAfter="₽"
              formatter={value =>
                `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
              }
              parser={value => Number(value!.replace(/\s?₽|(,*)/g, '')) || 0}
            />
          </Form.Item>
        </div>

        <Form.Item name="responsible_person" label="Ответственное лицо">
          <Input placeholder="Иванов И.И." />
        </Form.Item>
      </Form>
    </Modal>
  )
}

export default ProjectModal
