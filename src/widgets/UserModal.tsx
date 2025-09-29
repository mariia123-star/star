import { Modal, Form, Input, Select, message } from 'antd'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  usersApi,
  User,
} from '../shared/api/users'

interface UserModalProps {
  visible: boolean
  onClose: () => void
  user?: User
}

const { Option } = Select

const UserModal = ({ visible, onClose, user }: UserModalProps) => {
  const [form] = Form.useForm()
  const queryClient = useQueryClient()

  const createMutation = useMutation({
    mutationFn: usersApi.create,
    onSuccess: () => {
      message.success('Пользователь успешно создан')
      queryClient.invalidateQueries({ queryKey: ['users'] })
      onClose()
      form.resetFields()
    },
    onError: (error: any) => {
      console.error('User creation error:', error)
      message.error(
        `Ошибка при создании пользователя: ${error.message || 'Неизвестная ошибка'}`
      )
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, ...data }: { id: string } & UpdateUserData) =>
      usersApi.update(id, data),
    onSuccess: () => {
      message.success('Пользователь успешно обновлен')
      queryClient.invalidateQueries({ queryKey: ['users'] })
      onClose()
      form.resetFields()
    },
    onError: (error: any) => {
      message.error(`Ошибка при обновлении пользователя: ${error.message}`)
    },
  })

  const handleSubmit = async (values: CreateUserData) => {
    if (user) {
      updateMutation.mutate({ id: user.id, ...values })
    } else {
      createMutation.mutate(values)
    }
  }

  const handleCancel = () => {
    onClose()
    form.resetFields()
  }

  return (
    <Modal
      title={user ? 'Редактировать пользователя' : 'Добавить пользователя'}
      open={visible}
      onOk={() => form.submit()}
      onCancel={handleCancel}
      confirmLoading={createMutation.isPending || updateMutation.isPending}
      width={500}
      okText={user ? 'Обновить' : 'Создать'}
      cancelText="Отмена"
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        initialValues={
          user
            ? {
                full_name: user.full_name,
                email: user.email,
                role: user.role,
              }
            : { role: 'инженер' }
        }
      >
        <Form.Item
          name="full_name"
          label="ФИО"
          rules={[
            { required: true, message: 'Введите ФИО пользователя' },
            { min: 2, message: 'ФИО должно содержать минимум 2 символа' },
            { max: 200, message: 'ФИО не должно превышать 200 символов' },
          ]}
        >
          <Input placeholder="Иванов Иван Иванович" />
        </Form.Item>

        <Form.Item
          name="email"
          label="Электронная почта"
          rules={[
            { required: true, message: 'Введите электронную почту' },
            { type: 'email', message: 'Введите корректный email адрес' },
          ]}
        >
          <Input placeholder="ivan@star-portal.ru" />
        </Form.Item>

        <Form.Item
          name="role"
          label="Роль"
          rules={[{ required: true, message: 'Выберите роль пользователя' }]}
        >
          <Select placeholder="Выберите роль">
            <Option value="администратор">Администратор</Option>
            <Option value="инженер">Инженер</Option>
          </Select>
        </Form.Item>
      </Form>
    </Modal>
  )
}

export default UserModal
