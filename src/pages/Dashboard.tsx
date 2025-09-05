import { Card, Row, Col, Typography, Statistic, Space } from 'antd'
import { 
  FileTextOutlined, 
  BookOutlined, 
  BarChartOutlined,
  TeamOutlined
} from '@ant-design/icons'

const { Title, Paragraph } = Typography

function Dashboard() {
  return (
    <div>
      <Title level={2}>Дашборд</Title>
      <Paragraph type="secondary">
        Добро пожаловать в корпоративный портал STAR
      </Paragraph>

      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Тендерные сметы"
              value={15}
              prefix={<FileTextOutlined />}
              valueStyle={{ color: '#3f8600' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Единиц измерения"
              value={12}
              prefix={<BookOutlined />}
              valueStyle={{ color: '#1677ff' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Активных проектов"
              value={8}
              prefix={<BarChartOutlined />}
              valueStyle={{ color: '#cf1322' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Пользователей"
              value={23}
              prefix={<TeamOutlined />}
              valueStyle={{ color: '#722ed1' }}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={12}>
          <Card 
            title="Быстрые ссылки" 
            bordered={false}
            size="small"
          >
            <Space direction="vertical" style={{ width: '100%' }}>
              <Card 
                size="small" 
                hoverable
                style={{ cursor: 'pointer' }}
                onClick={() => window.location.href = '/documents/tender-estimate'}
              >
                <Card.Meta
                  avatar={<FileTextOutlined style={{ fontSize: 20, color: '#1677ff' }} />}
                  title="Тендерная смета"
                  description="Управление тендерными сметами с материалами и работами"
                />
              </Card>
              
              <Card 
                size="small" 
                hoverable
                style={{ cursor: 'pointer' }}
                onClick={() => window.location.href = '/references/units'}
              >
                <Card.Meta
                  avatar={<BookOutlined style={{ fontSize: 20, color: '#52c41a' }} />}
                  title="Единицы измерения"
                  description="Справочник единиц измерения для документов"
                />
              </Card>
            </Space>
          </Card>
        </Col>

        <Col xs={24} lg={12}>
          <Card title="Последние обновления" bordered={false} size="small">
            <Space direction="vertical" style={{ width: '100%' }}>
              <div style={{ padding: '8px 0', borderBottom: '1px solid #f0f0f0' }}>
                <div style={{ fontWeight: 500 }}>Добавлена новая смета №15</div>
                <div style={{ fontSize: 12, color: '#666' }}>5 минут назад</div>
              </div>
              
              <div style={{ padding: '8px 0', borderBottom: '1px solid #f0f0f0' }}>
                <div style={{ fontWeight: 500 }}>Обновлен справочник единиц измерения</div>
                <div style={{ fontSize: 12, color: '#666' }}>2 часа назад</div>
              </div>
              
              <div style={{ padding: '8px 0', borderBottom: '1px solid #f0f0f0' }}>
                <div style={{ fontWeight: 500 }}>Создан новый проект "Реконструкция"</div>
                <div style={{ fontSize: 12, color: '#666' }}>Вчера</div>
              </div>
              
              <div style={{ padding: '8px 0' }}>
                <div style={{ fontWeight: 500 }}>Система обновлена до версии 2.1.0</div>
                <div style={{ fontSize: 12, color: '#666' }}>3 дня назад</div>
              </div>
            </Space>
          </Card>
        </Col>
      </Row>
    </div>
  )
}

export default Dashboard