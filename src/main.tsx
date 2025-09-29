import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import dayjs from 'dayjs'
import 'dayjs/locale/ru'
import App from './app/App'
import './shared/styles/global.css'

dayjs.locale('ru')

const container = document.getElementById('root')
if (!container) throw new Error('Root container not found')

const root = createRoot(container)

root.render(
  <StrictMode>
    <App />
  </StrictMode>
)
