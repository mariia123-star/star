import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ConfigProvider } from 'antd'
import ruRU from 'antd/locale/ru_RU'
import dayjs from 'dayjs'
import 'dayjs/locale/ru'

dayjs.locale('ru')

import './shared/styles/global.css'

const container = document.getElementById('root')
if (!container) throw new Error('Root container not found')

const root = createRoot(container)

root.render(
  <StrictMode>
    <ConfigProvider locale={ruRU}>
      <div>
        <h1>STAR Portal</h1>
        <p>Добро пожаловать в STAR Portal!</p>
      </div>
    </ConfigProvider>
  </StrictMode>
)