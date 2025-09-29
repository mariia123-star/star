import React, { useState } from 'react'
import { Layout, Menu, Typography, theme } from 'antd'
import { useNavigate, useLocation } from 'react-router-dom'
import {
  DashboardOutlined,
  FileTextOutlined,
  SettingOutlined,
  FileOutlined,
  TeamOutlined,
  AppstoreOutlined,
  BuildOutlined,
  FolderOutlined,
  ColumnHeightOutlined,
  TagsOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  AuditOutlined,
} from '@ant-design/icons'

const { Header, Sider, Content } = Layout
const { Title } = Typography

interface MainLayoutProps {
  children: React.ReactNode
}

const menuItems = [
  {
    key: '/dashboard',
    icon: <DashboardOutlined />,
    label: 'Дашборд',
    className: 'main-menu-item',
  },
  {
    key: 'documents',
    icon: <FileTextOutlined />,
    label: 'Документы',
    className: 'main-menu-item',
    children: [
      {
        key: '/documents/tender-estimate',
        icon: <FileOutlined />,
        label: 'Тендерная смета',
        className: 'sub-menu-item',
      },
      {
        key: '/documents/tender-test',
        icon: <FileOutlined />,
        label: 'Тендер - тест',
        className: 'sub-menu-item',
      },
    ],
  },
  {
    key: 'developer',
    icon: <SettingOutlined />,
    label: 'Разработчик',
    className: 'main-menu-item',
    children: [
      {
        key: '/developer/users',
        icon: <TeamOutlined />,
        label: 'Пользователи',
        className: 'sub-menu-item',
      },
      {
        key: '/developer/rates',
        icon: <BuildOutlined />,
        label: 'Сборник расценок',
        className: 'sub-menu-item',
      },
      {
        key: '/developer/materials',
        icon: <AppstoreOutlined />,
        label: 'Сборник материалов',
        className: 'sub-menu-item',
      },
      {
        key: '/developer/audit-logs',
        icon: <AuditOutlined />,
        label: 'Журнал аудита',
        className: 'sub-menu-item',
      },
      {
        key: '/references/projects',
        icon: <FolderOutlined />,
        label: 'Проекты',
        className: 'sub-menu-item',
      },
      {
        key: '/references/units',
        icon: <ColumnHeightOutlined />,
        label: 'Единицы измерения',
        className: 'sub-menu-item',
      },
      {
        key: '/references/material-types',
        icon: <TagsOutlined />,
        label: 'Типы материалов',
        className: 'sub-menu-item',
      },
    ],
  },
]

function MainLayout({ children }: MainLayoutProps) {
  const [collapsed, setCollapsed] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()

  const { token } = theme.useToken()
  const { colorBgContainer, borderRadiusLG } = token

  const handleMenuClick = ({ key }: { key: string }) => {
    navigate(key)
  }

  const getSelectedKeys = () => {
    const path = location.pathname
    if (path === '/') return ['/dashboard']
    return [path]
  }

  const getOpenKeys = () => {
    const path = location.pathname
    if (path.startsWith('/documents/')) return ['documents']
    if (path.startsWith('/references/') || path.startsWith('/developer/'))
      return ['developer']
    return []
  }

  const getCurrentPageTitle = () => {
    const path = location.pathname
    const menuItem = findMenuItemByPath(menuItems, path)
    return menuItem?.label || 'STAR Portal'
  }

  const findMenuItemByPath = (items: any[], path: string): any => {
    for (const item of items) {
      if (item.key === path) return item
      if (item.children) {
        const found = findMenuItemByPath(item.children, path)
        if (found) return found
      }
    }
    return null
  }

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider
        trigger={null}
        collapsible
        collapsed={collapsed}
        width={280}
        collapsedWidth={80}
        style={{
          background: '#fafafa',
          borderRight: '1px solid #e8e8e8',
          position: 'relative',
        }}
      >
        <div
          style={{
            height: 64,
            display: 'flex',
            alignItems: 'center',
            justifyContent: collapsed ? 'center' : 'flex-start',
            padding: collapsed ? 0 : '0 24px',
            background: '#fff',
            borderBottom: '1px solid #e8e8e8',
            boxShadow: '0 1px 2px rgba(0, 0, 0, 0.03)',
          }}
        >
          {!collapsed && (
            <Title level={3} style={{ margin: 0, color: '#262626', fontWeight: 600 }}>
              STAR Portal
            </Title>
          )}
          {collapsed && (
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: '8px',
                background: 'linear-gradient(135deg, #1677ff, #69b1ff)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                fontSize: '18px',
                fontWeight: 'bold',
              }}
            >
              S
            </div>
          )}
        </div>

        <Menu
          mode="inline"
          selectedKeys={getSelectedKeys()}
          defaultOpenKeys={getOpenKeys()}
          onClick={handleMenuClick}
          style={{
            borderRight: 0,
            background: 'transparent',
            height: 'calc(100% - 64px)',
            padding: '16px 12px',
          }}
          items={menuItems}
        />
      </Sider>

      <Layout>
        <Header
          style={{
            padding: '0 24px',
            background: '#fff',
            borderBottom: '1px solid #e8e8e8',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            boxShadow: '0 1px 4px rgba(0, 0, 0, 0.02)',
            position: 'relative',
            zIndex: 10,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <button
              type="button"
              onClick={() => setCollapsed(!collapsed)}
              style={{
                fontSize: '16px',
                width: 36,
                height: 36,
                border: 'none',
                background: 'transparent',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '8px',
                color: '#595959',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = '#f5f5f5'
                e.currentTarget.style.color = '#262626'
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = 'transparent'
                e.currentTarget.style.color = '#595959'
              }}
            >
              {collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            </button>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div
                style={{
                  width: 4,
                  height: 24,
                  background: 'linear-gradient(135deg, #1677ff, #69b1ff)',
                  borderRadius: 2,
                }}
              />
              <Title 
                level={4} 
                style={{ 
                  margin: 0, 
                  color: '#262626', 
                  fontWeight: 600,
                  fontSize: '18px'
                }}
              >
                {getCurrentPageTitle()}
              </Title>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div
              style={{
                padding: '4px 12px',
                background: '#f0f7ff',
                color: '#1677ff',
                borderRadius: '16px',
                fontSize: '12px',
                fontWeight: 500,
                border: '1px solid #d6e4ff',
              }}
            >
              Онлайн
            </div>
          </div>
        </Header>

        <Content
          style={{
            background: '#f8f9fa',
            minHeight: 'calc(100vh - 64px)',
            position: 'relative',
          }}
        >
          <div
            style={{
              padding: '24px',
              height: '100%',
              background: '#fff',
              margin: '24px',
              borderRadius: '12px',
              boxShadow: '0 1px 2px rgba(0, 0, 0, 0.03), 0 1px 6px -1px rgba(0, 0, 0, 0.02)',
              border: '1px solid #f0f0f0',
            }}
          >
            {children}
          </div>
        </Content>
      </Layout>
    </Layout>
  )
}

export default MainLayout
